import type { D1Database } from './billing-db';
import { validateSignals } from './device-risk/validate.mjs';
import { protectSignals, compareSignals } from './device-risk/matcher.mjs';

export type DeviceRiskEnv = { DEVICE_RISK_ENABLED?: string; DEVICE_RISK_HMAC_SECRET?: string; DEVICE_RISK_OWNER_EMAIL?: string; BILLING_DB?: D1Database };
export type VerifiedUser = { id: string; email: string };
const retentionMs = 30 * 24 * 60 * 60 * 1000;
export const deviceRiskConfigured = (env: DeviceRiskEnv) => env.DEVICE_RISK_ENABLED === 'true' && typeof env.DEVICE_RISK_HMAC_SECRET === 'string' && new TextEncoder().encode(env.DEVICE_RISK_HMAC_SECRET).length >= 32 && typeof env.DEVICE_RISK_OWNER_EMAIL === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.DEVICE_RISK_OWNER_EMAIL.trim()) && !!env.BILLING_DB;
export function isRiskOwner(env: DeviceRiskEnv, user: VerifiedUser | null) {
  return deviceRiskConfigured(env) && !!env.DEVICE_RISK_OWNER_EMAIL && !!user && user.email.trim().toLowerCase() === env.DEVICE_RISK_OWNER_EMAIL.trim().toLowerCase();
}
export async function recordDevice(env: DeviceRiskEnv, user: VerifiedUser, signals: unknown, now = Date.now()) {
  if (!deviceRiskConfigured(env)) return { recorded: false };
  if (!validateSignals(signals)) throw new Error('Invalid device signals');
  const value = await protectSignals(signals, env.DEVICE_RISK_HMAC_SECRET!);
  const db = env.BILLING_DB!;
  const results=await db.batch([
    db.prepare('DELETE FROM device_risk_observations WHERE created_at < ?').bind(now-retentionMs),
    db.prepare('INSERT OR IGNORE INTO device_risk_observations (account_id,created_at,protected_signals) SELECT ?,?,? WHERE NOT EXISTS (SELECT 1 FROM account_deletions WHERE owner_id=?)').bind(user.id,now,JSON.stringify(value),user.id),
  ]);
  if ((results[1]?.meta?.changes ?? 0) > 0) return { recorded: true };
  const existing=await db.prepare('SELECT 1 AS present FROM device_risk_observations WHERE account_id=? AND NOT EXISTS (SELECT 1 FROM account_deletions WHERE owner_id=?)').bind(user.id,user.id).first<{present:number}>();
  return { recorded: !!existing };
}
type Row = { account_id: string; created_at: number; protected_signals: string; auth_email: string | null };
export async function listRiskObservations(env: DeviceRiskEnv, user: VerifiedUser | null, now = Date.now()) {
  if (!isRiskOwner(env,user)) return null;
  await env.BILLING_DB!.prepare('DELETE FROM device_risk_observations WHERE created_at < ?').bind(now-retentionMs).run();
  const result = await env.BILLING_DB!.prepare('SELECT d.account_id,d.created_at,d.protected_signals,a.auth_email FROM device_risk_observations d LEFT JOIN billing_accounts a ON a.auth_subject=d.account_id WHERE d.created_at >= ? ORDER BY d.created_at DESC LIMIT 100').bind(now-retentionMs).all<Row>();
  const rows = result.results ?? [];
  return rows.map((row,index) => {
    const current = JSON.parse(row.protected_signals);
    const matches = rows.slice(index+1).map(prior => ({ accountId:prior.account_id, ...compareSignals(current,JSON.parse(prior.protected_signals)) })).sort((a,b)=>b.score-a.score);
    return { accountId:row.account_id,email:row.auth_email,createdAt:row.created_at,codes:current.signals,bestMatch:matches[0] ?? null };
  });
}
