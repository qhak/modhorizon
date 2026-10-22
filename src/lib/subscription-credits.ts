import { randomUUID } from "node:crypto";
import type { D1Database, D1Statement } from "./billing-db";
import { BillingError } from "./billing-errors";
import type { PaidPlanId } from "./billing-catalog";

/** Prepend the authenticated event receipt in the same D1 batch. */
export function renewalCreditStatements(db: D1Database, accountId: string, subscriptionId: string,
  invoiceId: unknown, periodStart: unknown, credits: number, eventId: string, now: number): D1Statement[] {
  if (typeof invoiceId !== "string" || typeof periodStart !== "number" || !Number.isSafeInteger(periodStart) || periodStart <= 0)
    throw new BillingError("Invoice is missing its billing period.",400);
  return [
    db.prepare("INSERT OR IGNORE INTO subscription_credit_invoices(invoice_id,created_at) SELECT ?,? WHERE changes()=1").bind(invoiceId,now),
    // Delta is new minus unused monthly allowance. Purchased credits are untouched.
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,stripe_event_id,created_at)
      SELECT ?,id,?-allowance_credits,'subscription_credit_grant',?,? FROM billing_accounts
      WHERE id=? AND stripe_subscription_id=? AND plan_key<>'free' AND last_invoice_period_start<? AND changes()=1`)
      .bind(randomUUID(),credits,eventId,now,accountId,subscriptionId,periodStart),
    db.prepare(`UPDATE billing_accounts SET credit_balance=?+purchased_credits,allowance_credits=?,
      allowance_period=allowance_period+1,last_invoice_period_start=?,subscription_status='active',updated_at=?
      WHERE id=? AND stripe_subscription_id=? AND last_invoice_period_start<? AND changes()=1`)
      .bind(credits,credits,periodStart,now,accountId,subscriptionId,periodStart),
  ];
}
export function initialSubscriptionStatements(db: D1Database, accountId: string, checkoutId: unknown,
  subscriptionId: string | null, customerId: string | null, plan: PaidPlanId, credits: number, eventId: string, now: number): D1Statement[] {
  if (typeof checkoutId !== "string" || !subscriptionId) throw new BillingError("Missing subscription checkout ID.",400);
  return [
    db.prepare("INSERT OR IGNORE INTO subscription_checkout_grants(checkout_id,created_at) SELECT ?,? WHERE changes()=1").bind(checkoutId,now),
    // Never let late checkout events replace or reset an already attached subscription.
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,stripe_event_id,created_at)
      SELECT ?,id,?-allowance_credits,'subscription_credit_grant',?,? FROM billing_accounts
      WHERE id=? AND stripe_subscription_id IS NULL AND changes()=1`)
      .bind(randomUUID(),credits,eventId,now,accountId),
    db.prepare(`UPDATE billing_accounts SET plan_key=?,credit_balance=?+purchased_credits,allowance_credits=?,
      allowance_period=allowance_period+1,stripe_customer_id=COALESCE(?,stripe_customer_id),stripe_subscription_id=?,
      subscription_status='active',updated_at=? WHERE id=? AND stripe_subscription_id IS NULL AND changes()=1`)
      .bind(plan,credits,credits,customerId,subscriptionId,now,accountId),
  ];
}
