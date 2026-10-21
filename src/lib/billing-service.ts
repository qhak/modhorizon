import { createHash, randomBytes, randomUUID } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { BILLING_PLANS, isPaidPlanId, type PaidPlanId, type PlanId } from "./billing-catalog";
import { creditsForUsage, findModel } from "./models";
import type { GenerateRequest, GeneratedProject } from "./types";
import type { D1Database, D1Statement } from "./billing-db";
import { BillingError } from "./billing-errors";
import { holdCredits, completeCreditReservation } from "./credit-reservations";
import { quoteGeneration } from "./generation-quote";
export { BillingError } from "./billing-errors";

export const BILLING_SESSION_COOKIE = "mh_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

type BillingEnv = {
  BILLING_DB?: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_STARTER?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_STUDIO?: string;
};
type BillingAccountRow = {
  id: string; plan_key: PlanId; credit_balance: number; free_week_start: number;
  stripe_subscription_id: string | null; subscription_status: string;
};
export type BillingAccount = {
  id: string; plan: PlanId; credits: number; subscriptionStatus: string;
};

export async function billingEnv(): Promise<BillingEnv> {
  try {
    const context = await getCloudflareContext({ async: true });
    const env = context.env as unknown as BillingEnv;
    if (!env.BILLING_DB) throw new BillingError("Cloudflare D1 binding BILLING_DB is not configured.");
    return env;
  } catch (error) {
    if (error instanceof BillingError) throw error;
    throw new BillingError("Cloudflare bindings are unavailable. Start the OpenNext development server or configure the Worker bindings.");
  }
}

function dbFor(env: BillingEnv) {
  if (!env.BILLING_DB) throw new BillingError("Cloudflare D1 binding BILLING_DB is not configured.");
  return env.BILLING_DB;
}
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function sessionToken(request: Request) {
  return request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${BILLING_SESSION_COOKIE}=`))?.slice(BILLING_SESSION_COOKIE.length + 1);
}
function weekStart(now: number) {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.getTime();
}

async function findAccount(db: D1Database, token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await db.prepare(`SELECT a.id, a.plan_key, a.credit_balance, a.free_week_start,
      a.stripe_subscription_id, a.subscription_status
    FROM billing_sessions s JOIN billing_accounts a ON a.id=s.account_id
    WHERE s.token_hash=? AND s.expires_at>?`).bind(tokenHash(token), Date.now()).first<BillingAccountRow>();
  return row;
}
async function refreshFreeAllowance(db: D1Database, row: BillingAccountRow) {
  const start = weekStart(Date.now());
  if (row.plan_key === "free" && row.free_week_start < start) {
    const ledgerId = randomUUID(), now = Date.now(), grant = BILLING_PLANS.free.credits;
    await db.batch([
      db.prepare("UPDATE billing_accounts SET credit_balance=?, free_week_start=?, updated_at=? WHERE id=? AND plan_key='free' AND free_week_start<?")
        .bind(grant, start, now, row.id, start),
      db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,created_at)
        SELECT ?,id,?,'weekly_free_allowance',? FROM billing_accounts
        WHERE id=? AND changes()=1`).bind(ledgerId, grant, now, row.id),
    ]);
  }
}
function serializeAccount(row: BillingAccountRow): BillingAccount {
  return { id: row.id, plan: row.plan_key, credits: Number(row.credit_balance), subscriptionStatus: row.subscription_status };
}

export async function accountFromRequest(request: Request) {
  const env = await billingEnv(), db = dbFor(env);
  const row = await findAccount(db, sessionToken(request));
  if (!row) throw new BillingError("Your session has expired. Refresh the page and try again.", 401);
  await refreshFreeAllowance(db, row);
  const fresh = await findAccountById(db, row.id);
  return { env, db, account: serializeAccount(fresh ?? row) };
}
async function findAccountById(db: D1Database, id: string) {
  return db.prepare(`SELECT id,plan_key,credit_balance,free_week_start,stripe_subscription_id,subscription_status
    FROM billing_accounts WHERE id=?`).bind(id).first<BillingAccountRow>();
}

export async function openBillingSession(request: Request) {
  const env = await billingEnv(), db = dbFor(env);
  let token = sessionToken(request);
  let row = await findAccount(db, token);
  if (!row) {
    token = randomBytes(32).toString("base64url");
    const accountId = randomUUID(), now = Date.now(), start = weekStart(now), ledgerId = randomUUID();
    await db.batch([
      db.prepare("INSERT INTO billing_accounts(id,plan_key,credit_balance,free_week_start,subscription_status,created_at,updated_at) VALUES(?,'free',?,?, 'inactive',?,?)")
        .bind(accountId, BILLING_PLANS.free.credits, start, now, now),
      db.prepare("INSERT INTO billing_sessions(token_hash,account_id,expires_at,created_at) VALUES(?,?,?,?)")
        .bind(tokenHash(token), accountId, now + SESSION_TTL_MS, now),
      db.prepare("INSERT INTO credit_ledger(id,account_id,delta,reason,created_at) VALUES(?,?,?,'weekly_free_allowance',?)")
        .bind(ledgerId, accountId, BILLING_PLANS.free.credits, now),
    ]);
    row = await findAccount(db, token);
  } else {
    await refreshFreeAllowance(db, row);
    row = await findAccountById(db, row.id);
  }
  if (!row || !token) throw new BillingError("Could not initialize your account.");
  return { token, account: serializeAccount(row), env };
}

function accountIsPaid(account: BillingAccount) {
  return account.plan !== "free" && (account.subscriptionStatus === "active" || account.subscriptionStatus === "trialing");
}

export async function reserveGenerationCredits(accountId: string, request: GenerateRequest, errors?: string[]) {
  const modelId = request.modelId || "";
  const model = findModel(modelId);
  if (!model) throw new BillingError("Choose an available AI model.", 400);
  const { db } = await accountFromId(accountId);
  const row = await findAccountById(db, accountId);
  if (!row) throw new BillingError("Account not found.", 401);
  await refreshFreeAllowance(db, row);
  const current = await findAccountById(db, accountId);
  if (!current) throw new BillingError("Account not found.", 401);
  const account = serializeAccount(current);
  const { reservedCredits: reserved } = quoteGeneration(account, request, errors);
  if (model.provider === "demo") return { model, reserved: 0, reservationId: null, account };
  const reservationId = await holdCredits(db, accountId, modelId, reserved);
  if (!reservationId) throw new BillingError(`This generation may use up to ${reserved} credits, but your balance cannot cover it.`, 402);
  return { model, reserved, reservationId, account };
}
async function accountFromId(id: string) {
  const env = await billingEnv();
  return { env, db: dbFor(env), id };
}
export async function settleGenerationCredits(accountId: string, modelId: string, reservationId: string | null, result: GeneratedProject) {
  if (!reservationId) return 0;
  const { db } = await accountFromId(accountId);
  const actual = creditsForUsage(modelId, result.usage?.inputTokens ?? Math.ceil(JSON.stringify(result).length / 3), result.usage?.outputTokens ?? Math.ceil(JSON.stringify(result).length / 3));
  if (actual === null) throw new BillingError("Usage pricing is unavailable; your credit reservation is retained for reconciliation.");
  return completeCreditReservation(db, accountId, reservationId, "settled", actual);
}
export async function refundGenerationCredits(accountId: string, reservationId: string | null) {
  if (!reservationId) return;
  const { db } = await accountFromId(accountId);
  await completeCreditReservation(db, accountId, reservationId, "refunded");
}

export function publicBillingConfig(env: BillingEnv) {
  const key = env.STRIPE_SECRET_KEY || "";
  const priceConfigured = Boolean(env.STRIPE_PRICE_STARTER && env.STRIPE_PRICE_PRO && env.STRIPE_PRICE_STUDIO);
  return {
    plans: BILLING_PLANS,
    checkoutConfigured: key.startsWith("sk_test_") && priceConfigured,
    topupsConfigured: key.startsWith("sk_test_") && Boolean(env.STRIPE_WEBHOOK_SECRET),
  };
}

async function stripePost(env: BillingEnv, path: string, values: URLSearchParams) {
  const secret = env.STRIPE_SECRET_KEY;
  if (!secret?.startsWith("sk_test_")) throw new BillingError("Stripe test mode is not configured. Set STRIPE_SECRET_KEY to an sk_test_ key.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: values,
  });
  const data = await response.json() as Record<string, unknown>;
  if (!response.ok) {
    const message = data.error && typeof data.error === "object" ? (data.error as { message?: string }).message : undefined;
    throw new BillingError(typeof message === "string" ? `Stripe: ${message}` : "Stripe checkout could not be created.", 502);
  }
  return data;
}

export async function createStripeCheckout(request: Request, account: BillingAccount, body: Record<string, unknown>, env: BillingEnv) {
  const origin = new URL(request.url).origin;
  const values = new URLSearchParams();
  values.set("client_reference_id", account.id);
  values.set("success_url", `${origin}/create?billing=success`);
  values.set("cancel_url", `${origin}/pricing?billing=cancel`);
  values.set("allow_promotion_codes", "true");
  values.set("metadata[account_id]", account.id);
  if (isPaidPlanId(body.plan)) {
    if (accountIsPaid(account)) throw new BillingError("You already have an active paid plan. Plan changes are not available in this preview yet.", 409);
    const plan = body.plan;
    const price = env[`STRIPE_PRICE_${plan.toUpperCase()}` as "STRIPE_PRICE_STARTER" | "STRIPE_PRICE_PRO" | "STRIPE_PRICE_STUDIO"];
    if (!price) throw new BillingError(`Add the Stripe monthly price ID for ${BILLING_PLANS[plan].name}.`);
    values.set("mode", "subscription");
    values.set("line_items[0][price]", price);
    values.set("line_items[0][quantity]", "1");
    values.set("metadata[plan_key]", plan);
    values.set("subscription_data[metadata][account_id]", account.id);
    values.set("subscription_data[metadata][plan_key]", plan);
  } else if (body.pack === "100") {
    if (!accountIsPaid(account)) throw new BillingError("Credit packs are available to active paid subscribers.", 402);
    const plan = account.plan as PaidPlanId;
    const packCredits = 100;
    const unitAmountCents = Math.ceil(BILLING_PLANS[plan].extraCreditMilliUsd! * packCredits / 10);
    values.set("mode", "payment");
    values.set("line_items[0][price_data][currency]", "usd");
    values.set("line_items[0][price_data][unit_amount]", String(unitAmountCents));
    values.set("line_items[0][price_data][product_data][name]", "100 ModHorizon credits");
    values.set("line_items[0][quantity]", "1");
    values.set("metadata[purchase_kind]", "credit_pack");
    values.set("metadata[account_id]", account.id);
    values.set("metadata[plan_key]", plan);
    values.set("metadata[credits]", String(packCredits));
    values.set("payment_intent_data[metadata][account_id]", account.id);
  } else {
    throw new BillingError("Choose a valid plan or the 100-credit pack.", 400);
  }
  const session = await stripePost(env, "checkout/sessions", values);
  if (typeof session.url !== "string") throw new BillingError("Stripe did not return a checkout URL.", 502);
  return { url: session.url };
}

function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}
async function verifyStripeSignature(rawBody: string, signature: string | null, secret: string) {
  const pieces = (signature || "").split(",");
  const timestamp = pieces.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = pieces.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const seconds = Number(timestamp);
  if (!Number.isSafeInteger(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300 || !signatures.length) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  return signatures.some((candidate) => constantTimeEqual(candidate, expected));
}
function object(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? value as Record<string, unknown> : {}; }
function stripeId(value: unknown) { return typeof value === "string" ? value : typeof object(value).id === "string" ? object(value).id as string : null; }
function subscriptionIdFromInvoice(invoice: Record<string, unknown>) {
  const parent = object(invoice.parent), details = object(parent.subscription_details);
  return stripeId(invoice.subscription) || stripeId(details.subscription);
}

export async function processStripeWebhook(request: Request) {
  const env = await billingEnv(), db = dbFor(env), secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new BillingError("Stripe webhook secret is not configured.");
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) throw new BillingError("Webhook body is too large.", 413);
  if (!await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"), secret))
    throw new BillingError("Invalid Stripe webhook signature.", 400);
  let event: Record<string, unknown>;
  try { event = JSON.parse(rawBody) as Record<string, unknown>; }
  catch { throw new BillingError("Invalid Stripe webhook JSON.", 400); }
  const eventId = event.id, eventType = event.type, data = object(event.data), item = object(data.object);
  if (typeof eventId !== "string" || typeof eventType !== "string") throw new BillingError("Invalid Stripe event.", 400);
  const now = Date.now();
  const markEvent = db.prepare("INSERT OR IGNORE INTO stripe_webhook_events(event_id,event_type,received_at) VALUES(?,?,?)").bind(eventId, eventType, now);
  const commit = async (steps: D1Statement[] = []) => {
    const results = await db.batch([markEvent, ...steps]);
    return { received: true, duplicate: !results[0]?.meta?.changes };
  };

  if (eventType === "checkout.session.completed") {
    const metadata = object(item.metadata), accountId = metadata.account_id;
    const customerId = stripeId(item.customer), subId = stripeId(item.subscription);
    if (typeof accountId === "string" && item.payment_status === "paid") {
      if (item.mode === "subscription" && isPaidPlanId(metadata.plan_key)) {
        const plan = metadata.plan_key, credits = BILLING_PLANS[plan].credits;
        return commit([
          db.prepare(`UPDATE billing_accounts SET plan_key=?,credit_balance=?,stripe_customer_id=COALESCE(?,stripe_customer_id),stripe_subscription_id=?,subscription_status='active',updated_at=? WHERE id=? AND changes()=1`)
            .bind(plan, credits, customerId, subId, now, accountId),
          db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,stripe_event_id,created_at)
            SELECT ?,id,?,'subscription_credit_grant',?,? FROM billing_accounts WHERE id=? AND changes()=1`)
            .bind(randomUUID(), credits, eventId, now, accountId),
        ]);
      } else if (item.mode === "payment" && metadata.purchase_kind === "credit_pack" && metadata.credits === "100" && isPaidPlanId(metadata.plan_key)) {
        const plan = metadata.plan_key, amountCents = Math.ceil(BILLING_PLANS[plan].extraCreditMilliUsd * 100 / 10);
        if (Number(item.amount_total) === amountCents) {
          return commit([
            db.prepare("UPDATE billing_accounts SET credit_balance=credit_balance+100,updated_at=? WHERE id=? AND plan_key=? AND subscription_status='active' AND changes()=1")
              .bind(now, accountId, plan),
            db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,stripe_event_id,created_at)
              SELECT ?,id,100,'manual_credit_pack',?,? FROM billing_accounts WHERE id=? AND changes()=1`)
              .bind(randomUUID(), eventId, now, accountId),
          ]);
        }
      }
    }
  } else if (eventType === "invoice.paid") {
    const subId = subscriptionIdFromInvoice(item);
    if (subId && item.billing_reason === "subscription_cycle") {
      const row = await db.prepare("SELECT id,plan_key FROM billing_accounts WHERE stripe_subscription_id=?").bind(subId).first<{id:string;plan_key:PlanId}>();
      if (row && row.plan_key !== "free") {
        const credits = BILLING_PLANS[row.plan_key].credits;
        return commit([
          db.prepare("UPDATE billing_accounts SET credit_balance=?,subscription_status='active',updated_at=? WHERE id=? AND changes()=1")
            .bind(credits, now, row.id),
          db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,stripe_event_id,created_at)
            SELECT ?,id,?,'subscription_credit_grant',?,? FROM billing_accounts WHERE id=? AND changes()=1`)
            .bind(randomUUID(), credits, eventId, now, row.id),
        ]);
      }
    }
  } else if (eventType === "invoice.payment_failed") {
    const subId = subscriptionIdFromInvoice(item);
    if (subId) return commit([db.prepare("UPDATE billing_accounts SET subscription_status='past_due',updated_at=? WHERE stripe_subscription_id=? AND changes()=1").bind(now, subId)]);
  } else if (eventType === "customer.subscription.deleted") {
    const subId = stripeId(item.id);
    if (subId) return commit([db.prepare(`UPDATE billing_accounts SET plan_key='free',credit_balance=?,free_week_start=?,stripe_subscription_id=NULL,subscription_status='canceled',updated_at=? WHERE stripe_subscription_id=? AND changes()=1`)
      .bind(BILLING_PLANS.free.credits, weekStart(now), now, subId)]);
  } else if (eventType === "customer.subscription.updated") {
    const subId = stripeId(item.id), status = item.status;
    if (subId && typeof status === "string") return commit([db.prepare("UPDATE billing_accounts SET subscription_status=?,updated_at=? WHERE stripe_subscription_id=? AND changes()=1")
      .bind(status, now, subId)]);
  }
  return commit();
}

export async function sessionForRequest(request: Request) {
  const env = await billingEnv(), db = dbFor(env), row = await findAccount(db, sessionToken(request));
  if (!row) return null;
  await refreshFreeAllowance(db, row);
  const fresh = await findAccountById(db, row.id);
  return fresh ? serializeAccount(fresh) : null;
}

export async function revokeBillingSession(request: Request) {
  const token = sessionToken(request);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  const env = await billingEnv();
  await dbFor(env).prepare("DELETE FROM billing_sessions WHERE token_hash=?").bind(tokenHash(token)).run();
}

