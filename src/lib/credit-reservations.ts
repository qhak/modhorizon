import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";

type ReservationRow = {
  id: string; reserved_credits: number; charged_credits: number;
  allowance_reserved: number; purchased_reserved: number; allowance_period: number;
  state: "held" | "settled" | "refunded";
};

/** Each D1 batch is atomic; capture the bucket allocation before debiting it. */
export async function holdCredits(db: D1Database, accountId: string, modelId: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new BillingError("Invalid credit reservation.");
  const id = randomUUID(), now = Date.now();
  const result = await db.batch([
    db.prepare(`INSERT INTO generation_credit_reservations
      (id,account_id,model_id,reserved_credits,created_at,allowance_reserved,purchased_reserved,allowance_period)
      SELECT ?,id,?,?,?,MIN(allowance_credits,?),MAX(?-allowance_credits,0),allowance_period
      FROM billing_accounts WHERE id=? AND credit_balance>=? AND allowance_credits+purchased_credits>=? AND deletion_requested_at IS NULL`)
      .bind(id, modelId, amount, now, amount, amount, accountId, amount, amount),
    db.prepare(`UPDATE billing_accounts SET credit_balance=credit_balance-?,
      allowance_credits=allowance_credits-MIN(allowance_credits,?),
      purchased_credits=purchased_credits-MAX(?-allowance_credits,0),updated_at=?
      WHERE id=? AND changes()=1`).bind(amount, amount, amount, now, accountId),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,model_id,created_at,reservation_id)
      SELECT ?,account_id,-reserved_credits,'generation_reserve',model_id,?,id
      FROM generation_credit_reservations WHERE id=? AND changes()=1`)
      .bind(randomUUID(), now, id),
  ]);
  return result[0]?.meta.changes ? id : null;
}

/** Restore purchased credits always; expired monthly allocations cannot enter a new period. */
export async function completeCreditReservation(
  db: D1Database, accountId: string, reservationId: string | null,
  outcome: "settled" | "refunded", actualCredits = 0,
) {
  if (!Number.isSafeInteger(actualCredits) || actualCredits < 0) throw new BillingError("Invalid usage charge.");
  const row = await db.prepare(`SELECT id,reserved_credits,charged_credits,state,
    allowance_reserved,purchased_reserved,allowance_period
    FROM generation_credit_reservations WHERE id=? AND account_id=?`)
    .bind(reservationId, accountId).first<ReservationRow>();
  if (!row) throw new BillingError("Credit reservation was not found.", 404);
  const charge = outcome === "refunded" ? 0 : Math.min(actualCredits, row.reserved_credits);
  const allowanceRefund = Math.max(row.allowance_reserved - charge, 0);
  const purchasedRefund = row.purchased_reserved - Math.max(charge - row.allowance_reserved, 0);
  const now = Date.now(), reason = outcome === "settled" ? "generation_settlement" : "generation_refund";
  const results = await db.batch([
    db.prepare(`UPDATE generation_credit_reservations SET state=?,charged_credits=?,completed_at=?
      WHERE id=? AND account_id=? AND state='held'`)
      .bind(outcome, charge, now, reservationId, accountId),
    db.prepare(`UPDATE billing_accounts SET
      credit_balance=credit_balance+?+CASE WHEN allowance_period=? THEN ? ELSE 0 END,
      purchased_credits=purchased_credits+?,
      allowance_credits=allowance_credits+CASE WHEN allowance_period=? THEN ? ELSE 0 END,updated_at=?
      WHERE id=? AND changes()=1`)
      .bind(purchasedRefund,row.allowance_period,allowanceRefund,purchasedRefund,row.allowance_period,allowanceRefund,now,accountId),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,model_id,created_at,reservation_id)
      SELECT ?,r.account_id,?+CASE WHEN a.allowance_period=r.allowance_period THEN ? ELSE 0 END,?,r.model_id,?,r.id
      FROM generation_credit_reservations r JOIN billing_accounts a ON a.id=r.account_id
      WHERE r.id=? AND r.account_id=? AND changes()=1`)
      .bind(randomUUID(),purchasedRefund,allowanceRefund,reason,now,reservationId,accountId),
  ]);
  if (results[0]?.meta.changes) return charge;
  const completed = await db.prepare("SELECT charged_credits FROM generation_credit_reservations WHERE id=? AND account_id=?")
    .bind(reservationId, accountId).first<{ charged_credits: number }>();
  return completed?.charged_credits ?? 0;
}
