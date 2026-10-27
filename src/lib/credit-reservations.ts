import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";
import { expireRewardedAdCredits } from "./rewarded-ads";

type ReservationRow = {
  id: string; reserved_credits: number; charged_credits: number;
  allowance_reserved: number; purchased_reserved: number; rewarded_ad_reserved: number; allowance_period: number;
  state: "held" | "settled" | "refunded";
};

/** Each D1 batch is atomic; capture the bucket allocation before debiting it. */
export async function holdCredits(db: D1Database, accountId: string, modelId: string, amount: number) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new BillingError("Invalid credit reservation.");
  const id = randomUUID(), now = Date.now();
  await expireRewardedAdCredits(db, accountId, now);
  const result = await db.batch([
    db.prepare(`INSERT INTO generation_credit_reservations
      (id,account_id,model_id,reserved_credits,created_at,allowance_reserved,purchased_reserved,rewarded_ad_reserved,allowance_period)
      SELECT ?,id,?,?,?,MIN(allowance_credits,?),
        MAX(?-allowance_credits-rewarded_ad_credits,0),
        MIN(rewarded_ad_credits,MAX(?-allowance_credits,0)),allowance_period
      FROM billing_accounts WHERE id=? AND credit_balance>=?
        AND allowance_credits+purchased_credits+rewarded_ad_credits>=? AND deletion_requested_at IS NULL`)
      .bind(id, modelId, amount, now, amount, amount, amount, accountId, amount, amount),
    db.prepare(`WITH ranked AS (
        SELECT id,credits_remaining,expires_at,granted_at,
          COALESCE(SUM(credits_remaining) OVER (
            ORDER BY expires_at,granted_at,id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS prior_credits
        FROM rewarded_ad_claims
        WHERE account_id=? AND state='granted' AND credits_remaining>0 AND expires_at>?
      ), reservation AS (
        SELECT rewarded_ad_reserved FROM generation_credit_reservations
        WHERE id=? AND account_id=? AND state='held'
      )
      INSERT INTO generation_credit_reservation_ad_rewards(reservation_id,claim_id,credits_reserved)
      SELECT ?,ranked.id,MIN(ranked.credits_remaining,MAX(reservation.rewarded_ad_reserved-ranked.prior_credits,0))
      FROM ranked CROSS JOIN reservation
      WHERE MIN(ranked.credits_remaining,MAX(reservation.rewarded_ad_reserved-ranked.prior_credits,0))>0`)
      .bind(accountId, now, id, accountId, id),
    db.prepare(`UPDATE rewarded_ad_claims SET credits_remaining=credits_remaining-(
        SELECT credits_reserved FROM generation_credit_reservation_ad_rewards
        WHERE reservation_id=? AND claim_id=rewarded_ad_claims.id),updated_at=?
      WHERE id IN (SELECT claim_id FROM generation_credit_reservation_ad_rewards WHERE reservation_id=?)`)
      .bind(id, now, id),
    db.prepare(`UPDATE billing_accounts SET
        credit_balance=credit_balance-(SELECT allowance_reserved+purchased_reserved FROM generation_credit_reservations WHERE id=?),
        allowance_credits=allowance_credits-(SELECT allowance_reserved FROM generation_credit_reservations WHERE id=?),
        purchased_credits=purchased_credits-(SELECT purchased_reserved FROM generation_credit_reservations WHERE id=?),updated_at=?
      WHERE id=? AND EXISTS(SELECT 1 FROM generation_credit_reservations WHERE id=? AND account_id=? AND state='held')`)
      .bind(id, id, id, now, accountId, id, accountId),
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
    allowance_reserved,purchased_reserved,rewarded_ad_reserved,allowance_period
    FROM generation_credit_reservations WHERE id=? AND account_id=?`)
    .bind(reservationId, accountId).first<ReservationRow>();
  if (!row) throw new BillingError("Credit reservation was not found.", 404);
  const charge = outcome === "refunded" ? 0 : Math.min(actualCredits, row.reserved_credits);
  const allowanceRefund = Math.max(row.allowance_reserved - charge, 0);
  const rewardedAdCharged = Math.min(row.rewarded_ad_reserved, Math.max(charge - row.allowance_reserved, 0));
  const purchasedRefund = row.purchased_reserved - Math.max(charge - row.allowance_reserved - row.rewarded_ad_reserved, 0);
  const now = Date.now(), reason = outcome === "settled" ? "generation_settlement" : "generation_refund";
  await db.batch([
    db.prepare(`UPDATE generation_credit_reservations SET state=?,charged_credits=?,rewarded_ad_charged=?,completed_at=?,settlement_effects_applied=0
      WHERE id=? AND account_id=? AND state='held'`)
      .bind(outcome, charge, rewardedAdCharged, now, reservationId, accountId),
    db.prepare(`WITH ranked AS (
        SELECT c.id,c.expires_at,c.granted_at,r.credits_reserved,
          COALESCE(SUM(r.credits_reserved) OVER (
            ORDER BY c.expires_at,c.granted_at,c.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS prior_credits
        FROM generation_credit_reservation_ad_rewards r
        JOIN rewarded_ad_claims c ON c.id=r.claim_id
        WHERE r.reservation_id=?
      ), refunds AS (
        SELECT id,expires_at,credits_reserved-MIN(credits_reserved,MAX(?-prior_credits,0)) AS amount
        FROM ranked
      )
      UPDATE rewarded_ad_claims SET credits_remaining=credits_remaining+(
          SELECT amount FROM refunds WHERE id=rewarded_ad_claims.id),updated_at=?
      WHERE id IN (SELECT id FROM refunds WHERE amount>0 AND expires_at>?)
        AND EXISTS(SELECT 1 FROM generation_credit_reservations WHERE id=? AND settlement_effects_applied=0)`)
      .bind(reservationId, rewardedAdCharged, now, now, reservationId),
    db.prepare(`UPDATE billing_accounts SET
      credit_balance=credit_balance+?+CASE WHEN allowance_period=? THEN ? ELSE 0 END,
      purchased_credits=purchased_credits+?,
      allowance_credits=allowance_credits+CASE WHEN allowance_period=? THEN ? ELSE 0 END,updated_at=?
      WHERE id=? AND EXISTS(SELECT 1 FROM generation_credit_reservations WHERE id=? AND settlement_effects_applied=0)`)
      .bind(purchasedRefund,row.allowance_period,allowanceRefund,purchasedRefund,row.allowance_period,allowanceRefund,now,accountId,reservationId),
    db.prepare(`WITH ranked AS (
        SELECT c.id,c.expires_at,c.granted_at,r.credits_reserved,
          COALESCE(SUM(r.credits_reserved) OVER (
            ORDER BY c.expires_at,c.granted_at,c.id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS prior_credits
        FROM generation_credit_reservation_ad_rewards r
        JOIN rewarded_ad_claims c ON c.id=r.claim_id
        WHERE r.reservation_id=?
      ), refunds AS (
        SELECT expires_at,credits_reserved-MIN(credits_reserved,MAX(?-prior_credits,0)) AS amount
        FROM ranked
      )
      INSERT INTO credit_ledger(id,account_id,delta,reason,model_id,created_at,reservation_id)
      SELECT ?,r.account_id,?+CASE WHEN a.allowance_period=r.allowance_period THEN ? ELSE 0 END+
        COALESCE((SELECT SUM(amount) FROM refunds WHERE expires_at>?),0),?,r.model_id,?,r.id
      FROM generation_credit_reservations r JOIN billing_accounts a ON a.id=r.account_id
      WHERE r.id=? AND r.account_id=? AND r.settlement_effects_applied=0`)
      .bind(reservationId,rewardedAdCharged,randomUUID(),purchasedRefund,allowanceRefund,now,reason,now,reservationId,accountId),
    db.prepare(`UPDATE generation_credit_reservations SET settlement_effects_applied=1
      WHERE id=? AND account_id=? AND settlement_effects_applied=0 AND state IN ('settled','refunded')`)
      .bind(reservationId,accountId),
  ]);
  const completed = await db.prepare("SELECT charged_credits FROM generation_credit_reservations WHERE id=? AND account_id=?")
    .bind(reservationId, accountId).first<{ charged_credits: number }>();
  return completed?.charged_credits ?? 0;
}
