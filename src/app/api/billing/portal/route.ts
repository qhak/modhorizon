import { accountFromRequest, BillingError } from "@/lib/billing-service";
import { hasAllowedOrigin } from "@/lib/request-origin";
import { stripeMode } from "@/lib/stripe-config";
import { accountAppOrigin } from "@/lib/account-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!hasAllowedOrigin(request)) return Response.json({ error: "A same-origin request is required." }, { status: 403, headers });
  try {
    const { account, env, db } = await accountFromRequest(request);
    const row = await db.prepare("SELECT stripe_customer_id,auth_subject FROM billing_accounts WHERE id=?")
      .bind(account.id).first<{ stripe_customer_id: string | null; auth_subject: string | null }>();
    if (!row?.auth_subject) throw new BillingError("Sign in to manage billing.", 401);
    if (!row.stripe_customer_id) throw new BillingError("No Stripe billing account is linked yet.", 404);
    if (!stripeMode(env.STRIPE_SECRET_KEY)) throw new BillingError("Payments are not configured.");
    const values = new URLSearchParams({ customer: row.stripe_customer_id, return_url: `${await accountAppOrigin(request)}/account` });
    if (env.STRIPE_PORTAL_CONFIGURATION_ID) values.set("configuration", env.STRIPE_PORTAL_CONFIGURATION_ID);
    const result = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST", redirect: "manual", signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: values,
    });
    if (!result.ok) throw new BillingError("Stripe billing management is unavailable. Check the customer portal configuration.", 502);
    const data = await result.json() as { url?: unknown };
    if (typeof data.url !== "string" || new URL(data.url).origin !== "https://billing.stripe.com")
      throw new BillingError("Stripe did not return a billing portal URL.", 502);
    return Response.json({ url: data.url }, { headers });
  } catch (error) {
    const status = error instanceof BillingError ? error.status : 503;
    return Response.json({ error: error instanceof BillingError ? error.message : "Billing management is unavailable." }, { status, headers });
  }
}
