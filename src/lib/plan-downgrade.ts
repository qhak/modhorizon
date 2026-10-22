import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";

export function subscriptionCancellationState(item: Record<string, unknown>) {
  const items = item.items as { data?: { current_period_end?: number }[] } | undefined;
  const ends = items?.data?.map(entry => entry.current_period_end).filter((end): end is number => Number.isSafeInteger(end) && Number(end) > 0) ?? [];
  const end = typeof item.current_period_end === "number" ? item.current_period_end : ends.length ? Math.min(...ends) : null;
  return { scheduled: item.cancel_at_period_end === true, periodEnd: end && Number.isSafeInteger(end) ? end : null };
}

export async function scheduleStripeDowngrade(secret: string, subscriptionId: string) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "POST", redirect: "manual", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ cancel_at_period_end: "true" }),
  });
  if (!response.ok) throw new BillingError("Could not cancel renewal. Please refresh and try again.", 502);
  const subscription = await response.json() as Record<string, unknown>;
  const state = subscriptionCancellationState(subscription);
  if (subscription.id !== subscriptionId || !state.scheduled)
    throw new BillingError("Stripe did not confirm cancellation. Please refresh and try again.", 502);
  return state;
}

/** Only complimentary accounts can switch immediately; Stripe subscriptions must be canceled at Stripe. */
export async function downgradeComplimentaryAccount(db: D1Database, accountId: string, now = Date.now()) {
  const date = new Date(now);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  const result = await db.batch([
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,created_at)
      SELECT ?,id,10-allowance_credits,'complimentary_plan_downgrade',? FROM billing_accounts
      WHERE id=? AND auth_subject IS NOT NULL AND plan_key<>'free' AND stripe_subscription_id IS NULL`)
      .bind(randomUUID(), now, accountId),
    db.prepare(`UPDATE billing_accounts SET plan_key='free',subscription_status='inactive',
      credit_balance=10+purchased_credits,allowance_credits=10,allowance_period=allowance_period+1,
      free_week_start=?,cancel_at_period_end=0,current_period_end=NULL,updated_at=?
      WHERE id=? AND stripe_subscription_id IS NULL AND changes()=1`).bind(date.getTime(), now, accountId),
  ]);
  if (!result[0]?.meta.changes) throw new BillingError("Your plan changed. Refresh and try again.", 409);
}
