import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { BillingError } from "./billing-errors";

export const REWARDED_AD_DAILY_LIMIT = 5;
export const REWARDED_AD_CREDIT_REWARD = 1;
export const REWARDED_AD_CREDIT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CLAIM_TTL_MS = 10 * 60 * 1000;

export type RewardedAdsEnv = {
  REWARDED_ADS_ENABLED?: string;
  GAM_REWARDED_AD_UNIT_PATH?: string;
};

export function rewardedAdsConfigured(env: RewardedAdsEnv) {
  return env.REWARDED_ADS_ENABLED === "true"
    && typeof env.GAM_REWARDED_AD_UNIT_PATH === "string"
    && /^\/\d+(?:\/[A-Za-z0-9_-]+)+$/.test(env.GAM_REWARDED_AD_UNIT_PATH);
}

export function utcDayKey(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

export async function expireRewardedAdCredits(db: D1Database, accountId: string, now = Date.now()) {
  const eventId = randomUUID();
  const results = await db.batch([
    db.prepare(`UPDATE rewarded_ad_claims SET credits_remaining=0,updated_at=?
      WHERE account_id=? AND state='granted' AND expires_at<=? AND credits_remaining>0`)
      .bind(now, accountId, now),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,created_at)
      SELECT ?,?, -changes(),'rewarded_ad_expiry',? WHERE changes()>0`)
      .bind(eventId, accountId, now),
  ]);
  return results[0]?.meta.changes ?? 0;
}

export async function beginRewardedAdClaim(db: D1Database, accountId: string, now = Date.now()) {
  const id = randomUUID(), dayKey = utcDayKey(now);
  const results = await db.batch([
    db.prepare(`UPDATE rewarded_ad_claims SET state='cancelled',updated_at=?
      WHERE account_id=? AND state='pending' AND expires_at<=?`).bind(now, accountId, now),
    db.prepare(`INSERT INTO rewarded_ad_claims(id,account_id,day_key,state,credits_remaining,created_at,updated_at,expires_at)
      SELECT ?,a.id,?,'pending',0,?,?,? FROM billing_accounts a
      WHERE a.id=? AND a.plan_key='free' AND a.auth_subject IS NOT NULL AND a.deletion_requested_at IS NULL
        AND (SELECT COUNT(*) FROM rewarded_ad_claims c WHERE c.account_id=a.id AND c.day_key=? AND c.state='granted')<?
        AND NOT EXISTS(SELECT 1 FROM rewarded_ad_claims c WHERE c.account_id=a.id AND c.state='pending' AND c.expires_at>?)`)
      .bind(id, dayKey, now, now, now + CLAIM_TTL_MS, accountId, dayKey, REWARDED_AD_DAILY_LIMIT, now),
  ]);
  if (results[1]?.meta.changes) return { id, expiresAt: now + CLAIM_TTL_MS };
  const account = await db.prepare("SELECT plan_key,auth_subject,deletion_requested_at FROM billing_accounts WHERE id=?").bind(accountId).first<{plan_key:string;auth_subject:string|null;deletion_requested_at:number|null}>();
  if (!account?.auth_subject || account.deletion_requested_at) throw new BillingError("Sign in with a confirmed account to earn ad credits.", 401);
  if (account.plan_key !== "free") throw new BillingError("Rewarded ads are available to Free accounts.", 403);
  const daily = await db.prepare("SELECT COUNT(*) AS count FROM rewarded_ad_claims WHERE account_id=? AND day_key=? AND state='granted'").bind(accountId, dayKey).first<{count:number}>();
  if (Number(daily?.count ?? 0) >= REWARDED_AD_DAILY_LIMIT) throw new BillingError("You have reached today's five-ad limit.", 429);
  throw new BillingError("An ad reward is already in progress. Finish or close it before starting another.", 409);
}

export async function grantRewardedAdClaim(db: D1Database, accountId: string, claimId: string, now = Date.now()) {
  const expiresAt = now + REWARDED_AD_CREDIT_TTL_MS;
  const results = await db.batch([
    db.prepare(`UPDATE rewarded_ad_claims SET state='granted',credits_remaining=1,granted_at=?,updated_at=?,expires_at=?
      WHERE id=? AND account_id=? AND state='pending' AND expires_at>?
        AND EXISTS(SELECT 1 FROM billing_accounts a WHERE a.id=? AND a.plan_key='free'
          AND a.auth_subject IS NOT NULL AND a.deletion_requested_at IS NULL)
        AND (SELECT COUNT(*) FROM rewarded_ad_claims c WHERE c.account_id=? AND c.day_key=rewarded_ad_claims.day_key AND c.state='granted')<?`)
      .bind(now, now, expiresAt, claimId, accountId, now, accountId, accountId, REWARDED_AD_DAILY_LIMIT),
    db.prepare(`INSERT INTO credit_ledger(id,account_id,delta,reason,created_at)
      SELECT ?,?,1,'rewarded_ad_grant',? WHERE changes()=1`)
      .bind(randomUUID(), accountId, now),
  ]);
  return { granted: Boolean(results[0]?.meta.changes), credits: results[0]?.meta.changes ? REWARDED_AD_CREDIT_REWARD : 0, expiresAt: results[0]?.meta.changes ? expiresAt : null };
}

export async function cancelRewardedAdClaim(db: D1Database, accountId: string, claimId: string, now = Date.now()) {
  const result = await db.prepare(`UPDATE rewarded_ad_claims SET state='cancelled',updated_at=?
    WHERE id=? AND account_id=? AND state='pending'`).bind(now, claimId, accountId).run();
  return Boolean(result.meta.changes);
}

export async function rewardedAdStatus(db: D1Database, accountId: string, now = Date.now()) {
  const dayKey = utcDayKey(now);
  const row = await db.prepare(`SELECT a.plan_key,a.auth_subject,a.rewarded_ad_credits,a.deletion_requested_at,
      (SELECT COUNT(*) FROM rewarded_ad_claims c WHERE c.account_id=a.id AND c.day_key=? AND c.state='granted') AS used_today,
      EXISTS(SELECT 1 FROM rewarded_ad_claims c WHERE c.account_id=a.id AND c.state='pending' AND c.expires_at>?) AS claim_pending
    FROM billing_accounts a WHERE a.id=?`).bind(dayKey, now, accountId).first<{
      plan_key:string;auth_subject:string|null;rewarded_ad_credits:number;deletion_requested_at:number|null;used_today:number;claim_pending:number;
    }>();
  if (!row) throw new BillingError("Account not found.", 404);
  const eligible = row.plan_key === "free" && Boolean(row.auth_subject) && !row.deletion_requested_at;
  return {
    eligible,
    usedToday: Number(row.used_today),
    remainingToday: Math.max(0, REWARDED_AD_DAILY_LIMIT - Number(row.used_today)),
    rewardCredits: Number(row.rewarded_ad_credits),
    claimPending: Boolean(row.claim_pending),
    creditsPerAd: REWARDED_AD_CREDIT_REWARD,
    expiresAfterDays: 7,
  };
}
