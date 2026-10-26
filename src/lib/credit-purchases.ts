import { randomUUID } from "node:crypto";
import { isPaidPlanId } from "./billing-catalog";
import type { D1Database, D1Statement } from "./billing-db";
import { BillingError } from "./billing-errors";
import { topupAmountCents, validateTopup } from "./topup-pricing";

/** Only call after authenticating Stripe's signature and checking its event mode. */
export function paidTopupStatements(db: D1Database, item: Record<string, unknown>, metadata: Record<string, unknown>, eventId: string, now: number): D1Statement[] {
  if (item.payment_status !== "paid" || item.mode !== "payment" || metadata.purchase_kind !== "credit_pack"
    || !isPaidPlanId(metadata.plan_key) || typeof metadata.account_id !== "string" || typeof item.id !== "string")
    throw new BillingError("Invalid paid credit checkout.",400);
  const credits = Number(metadata.credits);
  // Honor pre-migration 100-credit checkouts that were already created before the $10 minimum.
  const legacy = metadata.credits === "100" && metadata.expected_amount_cents === undefined && metadata.currency === undefined;
  const amountCents = legacy ? topupAmountCents(metadata.plan_key,100) : validateTopup(metadata.plan_key,credits).amountCents;
  if (item.currency !== "usd" || item.amount_total !== amountCents || (!legacy && (metadata.currency !== "usd" || metadata.expected_amount_cents !== String(amountCents))))
    throw new BillingError("Top-up payment amount or currency does not match its quote.",400);
  return [
    db.prepare(`INSERT OR IGNORE INTO credit_purchases(checkout_id,account_id,credits,amount_cents,stripe_event_id,created_at)
      SELECT ?,id,?,?,?,? FROM billing_accounts WHERE id=? AND deletion_requested_at IS NULL AND changes()=1`)
      .bind(item.id,credits,amountCents,eventId,now,metadata.account_id),
    // Preserve paid purchases even if the plan changed after checkout creation.
    db.prepare("UPDATE billing_accounts SET credit_balance=credit_balance+?,purchased_credits=purchased_credits+?,updated_at=? WHERE id=? AND deletion_requested_at IS NULL AND changes()=1")
      .bind(credits,credits,now,metadata.account_id),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,stripe_event_id,created_at)
      SELECT ?,id,?,'manual_credit_pack',?,? FROM billing_accounts WHERE id=? AND deletion_requested_at IS NULL AND changes()=1`)
      .bind(randomUUID(),credits,eventId,now,metadata.account_id),
  ];
}
