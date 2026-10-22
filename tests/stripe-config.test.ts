import assert from "node:assert/strict";
import test from "node:test";
import { assertStripeEventMode, stripeMode, stripeReadiness } from "../src/lib/stripe-config";
import { createStripeCheckout, publicBillingConfig } from "../src/lib/billing-service";

const live = {
  STRIPE_SECRET_KEY: ["sk", "live", "fakeForAutomatedTestsOnly"].join("_"),
  STRIPE_WEBHOOK_SECRET: "whsec_fakeForAutomatedTestsOnly",
  STRIPE_PRICE_STARTER: "price_1UTI9SIwWA16AntFjOWwzL13",
  STRIPE_PRICE_PRO: "price_1UTIAKIwWA16AntFCY9DiFWW",
  STRIPE_PRICE_STUDIO: "price_1UTIApIwWA16AntFkbHRxzhc",
};
const account = { id: "owner", plan: "free" as const, credits: 10, subscriptionStatus: "inactive", authenticated: true };

test("live and test server keys are accepted; public and malformed keys are rejected", () => {
  for (const prefix of ["sk", "rk"]) {
    assert.equal(stripeMode(`${prefix}_live_fake`), "live");
    assert.equal(stripeMode(`${prefix}_test_fake`), "test");
  }
  for (const value of [undefined, "", "pk_live_fake", "sk_live_", "sk_live_...", "sk_live_fake\n"])
    assert.equal(stripeMode(value), null);
});

test("checkout cannot be enabled without credentials, prices and webhook delivery configured", () => {
  assert.equal(stripeReadiness(live).checkoutConfigured, true);
  assert.equal(stripeReadiness({ ...live, STRIPE_SECRET_KEY: "sk_test_fake" }).checkoutConfigured, true);
  for (const key of Object.keys(live)) {
    assert.equal(stripeReadiness({ ...live, [key]: undefined }).checkoutConfigured, false, key);
  }
  const config = publicBillingConfig(live);
  assert.equal(config.mode, "live");
  assert.ok(!JSON.stringify(config).includes(live.STRIPE_SECRET_KEY));
  assert.ok(!JSON.stringify(config).includes(live.STRIPE_WEBHOOK_SECRET));
});

test("signed events must explicitly match the configured mode", () => {
  assert.doesNotThrow(() => assertStripeEventMode(live, { livemode: true }));
  const sandbox = { ...live, STRIPE_SECRET_KEY: "sk_test_fake" };
  assert.doesNotThrow(() => assertStripeEventMode(sandbox, { livemode: false }));
  for (const event of [{ livemode: false }, {}, { livemode: "true" }])
    assert.throws(() => assertStripeEventMode(live, event), /mode does not match/);
  assert.throws(() => assertStripeEventMode(sandbox, { livemode: true }), /mode does not match/);
  assert.throws(() => assertStripeEventMode({}, { livemode: true }), /not configured/);
});

test("live checkout uses the supplied plan IDs and live authorization without making real API calls", async (t) => {
  const calls: { url: string; auth: string | null; body: URLSearchParams }[] = [];
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(init?.redirect, "manual");
    calls.push({ url: String(url), auth: new Headers(init?.headers).get("Authorization"), body: new URLSearchParams(String(init?.body)) });
    return Response.json({ url: "https://checkout.stripe.com/c/pay/fake" });
  });
  const request = new Request("https://modhorizon.example/api/billing/checkout");
  for (const plan of ["starter", "pro", "studio"] as const) {
    const result = await createStripeCheckout(request, account, { plan }, live);
    assert.equal(result.url, "https://checkout.stripe.com/c/pay/fake");
    const call = calls.at(-1)!;
    assert.equal(call.url, "https://api.stripe.com/v1/checkout/sessions");
    assert.equal(call.auth, `Bearer ${live.STRIPE_SECRET_KEY}`);
    assert.equal(call.body.get("line_items[0][price]"), live[`STRIPE_PRICE_${plan.toUpperCase()}` as keyof typeof live]);
    assert.equal(call.body.get("mode"), "subscription");
    assert.equal(call.body.get("subscription_data[metadata][account_id]"), account.id);
  }
  await assert.rejects(() => createStripeCheckout(request, account, { plan: "starter" }, { ...live, STRIPE_WEBHOOK_SECRET: undefined }), /webhook signing secret/);
  assert.equal(calls.length, 3);
});

test("Stripe redirects fail closed without forwarding authorization", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    assert.equal(init?.redirect, "manual");
    return new Response(null, { status: 302, headers: { Location: "https://example.net" } });
  });
  await assert.rejects(() => createStripeCheckout(new Request("https://modhorizon.example/api/billing/checkout"), account, { plan: "starter" }, live), /unexpected redirect/);
  assert.equal(calls, 1);
});

test("custom top-up checkout derives its price on the server and requires sign-in", async (t) => {
  const calls: URLSearchParams[] = [];
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls.push(new URLSearchParams(String(init?.body)));
    return Response.json({ url: "https://checkout.stripe.com/c/pay/fake" });
  });
  const request = new Request("https://modhorizon.example/api/billing/checkout");
  const subscriber = { ...account, plan: "starter" as const, subscriptionStatus: "active" };
  await createStripeCheckout(request, subscriber, { credits: 200, amount: 1, price: "price_cheaper" }, live);
  assert.equal(calls[0].get("mode"), "payment");
  assert.equal(calls[0].get("line_items[0][price_data][unit_amount]"), "1400");
  assert.equal(calls[0].get("metadata[credits]"), "200");
  assert.equal(calls[0].get("metadata[account_id]"), subscriber.id);
  assert.notEqual(calls[0].get("allow_promotion_codes"), "true");
  for (const credits of [142, 0, -1, 200.5, "200", 100001])
    await assert.rejects(() => createStripeCheckout(request, subscriber, { credits }, live));
  await assert.rejects(() => createStripeCheckout(request, { ...subscriber, authenticated: false }, { credits: 200 }, live), /Sign in/);
  await assert.rejects(() => createStripeCheckout(request, account, { credits: 200 }, live), /active paid/);
  assert.equal(calls.length, 1);
});

test("downgrade cancels renewal without deleting the subscription or changing its price", async (t) => {
  const { scheduleStripeDowngrade } = await import("../src/lib/plan-downgrade");
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
    calls++;
    assert.equal(String(url), "https://api.stripe.com/v1/subscriptions/sub_owner");
    assert.equal(init?.method, "POST");
    assert.equal(init?.redirect, "manual");
    assert.deepEqual([...new URLSearchParams(String(init?.body))], [["cancel_at_period_end", "true"]]);
    return Response.json({ id: "sub_owner", cancel_at_period_end: true, items: {data:[{current_period_end:1800000000}]} });
  });
  assert.deepEqual(await scheduleStripeDowngrade("sk_live_fake", "sub_owner"), {scheduled:true,periodEnd:1800000000});
  assert.equal(calls, 1);
});

test("downgrade rejects failed Stripe calls, redirects, or unconfirmed cancellation", async (t) => {
  const { scheduleStripeDowngrade } = await import("../src/lib/plan-downgrade");
  for (const result of [new Response(null,{status:500}), new Response(null,{status:302,headers:{Location:"https://example.net"}}), Response.json({id:"sub_other",cancel_at_period_end:true}), Response.json({id:"sub_owner",cancel_at_period_end:false})]) {
    const mock = t.mock.method(globalThis,"fetch",async () => result);
    await assert.rejects(scheduleStripeDowngrade("sk_live_fake","sub_owner"));
    mock.mock.restore();
  }
});
