import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";

type ReservationRow = {
  id: string;
  reserved_credits: number;
  charged_credits: number;
  state: "held" | "settled" | "refunded";
};

/** D1 batches are transactions. Each write is gated by the preceding write's changes(). */
export async function holdCredits(db: D1Database, accountId: string, modelId: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new BillingError("Invalid credit reservation.");
  const id = randomUUID(), now = Date.now();
  const result = await db.batch([
    db.prepare("UPDATE billing_accounts SET credit_balance=credit_balance-?,updated_at=? WHERE id=? AND credit_balance>=?")
      .bind(amount, now, accountId, amount),
    db.prepare(`INSERT INTO generation_credit_reservations(id,account_id,model_id,reserved_credits,created_at)
      SELECT ?,id,?,?,? FROM billing_accounts WHERE id=? AND changes()=1`)
      .bind(id, modelId, amount, now, accountId),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,model_id,created_at,reservation_id)
      SELECT ?,account_id,-reserved_credits,'generation_reserve',model_id,?,id
      FROM generation_credit_reservations WHERE id=? AND changes()=1`)
      .bind(randomUUID(), now, id),
  ]);
  return result[0]?.meta.changes ? id : null;
}

/** A hold has exactly one terminal state; duplicate or competing completions cannot credit twice. */
export async function completeCreditReservation(
  db: D1Database, accountId: string, reservationId: string,
  outcome: "settled" | "refunded", actualCredits = 0,
) {
  if (!Number.isSafeInteger(actualCredits) || actualCredits < 0)
    throw new BillingError("Invalid usage charge.");
  const row = await db.prepare(`SELECT id,reserved_credits,charged_credits,state
    FROM generation_credit_reservations WHERE id=? AND account_id=?`)
    .bind(reservationId, accountId).first<ReservationRow>();
  if (!row) throw new BillingError("Credit reservation was not found.", 404);
  const charge = outcome === "refunded" ? 0 : Math.min(actualCredits, row.reserved_credits);
  const now = Date.now(), reason = outcome === "settled" ? "generation_settlement" : "generation_refund";
  const results = await db.batch([
    db.prepare(`UPDATE generation_credit_reservations SET state=?,charged_credits=?,completed_at=?
      WHERE id=? AND account_id=? AND state='held'`)
      .bind(outcome, charge, now, reservationId, accountId),
    db.prepare(`UPDATE billing_accounts SET credit_balance=credit_balance+?,updated_at=?
      WHERE id=? AND changes()=1`)
      .bind(row.reserved_credits - charge, now, accountId),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,model_id,created_at,reservation_id)
      SELECT ?,account_id,reserved_credits-charged_credits,?,model_id,?,id
      FROM generation_credit_reservations WHERE id=? AND account_id=? AND changes()=1`)
      .bind(randomUUID(), reason, now, reservationId, accountId),
  ]);
  if (results[0]?.meta.changes) return charge;
  const completed = await db.prepare("SELECT charged_credits FROM generation_credit_reservations WHERE id=? AND account_id=?")
    .bind(reservationId, accountId).first<{ charged_credits: number }>();
  return completed?.charged_credits ?? 0;
}
