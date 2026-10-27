import type { D1Database } from "./billing-db";
import { CommunityError } from "./community";
import { removeAccountArtifacts } from "./project-store";

export function recentDeletionSignIn(claims: Record<string,unknown>, userId: string, now = Date.now()): boolean {
  if (claims.sub !== userId || typeof claims.session_id !== "string" || !claims.session_id || !Array.isArray(claims.amr)) return false;
  return claims.amr.some(item => item && typeof item === "object" &&
    ["password","oauth","otp","totp","sso/saml","sso","webauthn"].includes(String(item.method)) &&
    Number.isSafeInteger(item.timestamp) && item.timestamp * 1000 <= now + 30_000 && item.timestamp * 1000 >= now - 600_000);
}
export type DeletionBilling = { id:string; stripe_customer_id:string|null; stripe_subscription_id:string|null; deleted_at:number|null };
export type DeletionServices = {
  stopBilling(account:DeletionBilling):Promise<void>;
  revokeAuth():Promise<void>;
  deleteAuth():Promise<void>;
};
export async function deletionBilling(db:D1Database, ownerId:string) {
  return db.prepare("SELECT id,stripe_customer_id,stripe_subscription_id,deleted_at FROM billing_accounts WHERE auth_subject IN (?,?)").bind(ownerId,`deleted:${ownerId}`).first<DeletionBilling>();
}
export async function beginAccountDeletion(db:D1Database, ownerId:string) {
  const now=Date.now();
  const result=await db.batch([
    db.prepare(`INSERT OR IGNORE INTO account_deletions(owner_id,state,requested_at,updated_at)
      SELECT ?,'pending',?,? WHERE NOT EXISTS(SELECT 1 FROM generation_credit_reservations r JOIN billing_accounts a ON a.id=r.account_id WHERE a.auth_subject=? AND r.state='held')`).bind(ownerId,now,now,ownerId),
    db.prepare("UPDATE billing_accounts SET deletion_requested_at=COALESCE(deletion_requested_at,?),updated_at=? WHERE auth_subject=? AND EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=?)").bind(now,now,ownerId,ownerId),
  ]);
  const job=await db.prepare("SELECT state FROM account_deletions WHERE owner_id=?").bind(ownerId).first<{state:string}>();
  if (!job) throw new CommunityError("Wait for your current generation to finish before deleting your account.",409);
  return { state:job.state,created:!!result[0].meta.changes };
}
export async function purgeAccountContent(db:D1Database, ownerId:string) {
  // One atomic D1 batch; every predicate derives from the verified subject.
  const ownedPosts="SELECT id FROM community_posts WHERE owner_id=?";
  const ownedComments="SELECT id FROM community_comments WHERE owner_id=? OR post_id IN (SELECT id FROM community_posts WHERE owner_id=?)";
  await db.batch([
    db.prepare(`DELETE FROM community_content_reports WHERE owner_id=? OR (target_kind='profile' AND target_id IN (SELECT handle FROM community_profiles WHERE owner_id=?)) OR (target_kind='comment' AND target_id IN (${ownedComments}))`).bind(ownerId,ownerId,ownerId,ownerId),
    db.prepare(`DELETE FROM community_moderation_actions WHERE moderator_id=? OR target_id IN (${ownedPosts}) OR target_id IN (${ownedComments}) OR target_id IN (SELECT handle FROM community_profiles WHERE owner_id=?)`).bind(ownerId,ownerId,ownerId,ownerId,ownerId),
    db.prepare(`DELETE FROM community_reports WHERE owner_id=? OR post_id IN (${ownedPosts})`).bind(ownerId,ownerId),
    db.prepare(`DELETE FROM community_likes WHERE owner_id=? OR post_id IN (${ownedPosts})`).bind(ownerId,ownerId),
    db.prepare(`DELETE FROM community_comments WHERE owner_id=? OR post_id IN (${ownedPosts})`).bind(ownerId,ownerId),
    db.prepare("DELETE FROM community_follows WHERE owner_id=? OR target_owner_id=?").bind(ownerId,ownerId),
    db.prepare("DELETE FROM community_activity WHERE owner_id=?").bind(ownerId),
    db.prepare("DELETE FROM community_media WHERE owner_id=?").bind(ownerId),
    db.prepare("DELETE FROM community_posts WHERE owner_id=?").bind(ownerId),
    db.prepare("DELETE FROM community_profiles WHERE owner_id=?").bind(ownerId),
    db.prepare("DELETE FROM billing_sessions WHERE account_id IN (SELECT id FROM billing_accounts WHERE auth_subject IN (?,?))").bind(ownerId,`deleted:${ownerId}`),
    db.prepare("DELETE FROM rewarded_ad_claims WHERE account_id IN (SELECT id FROM billing_accounts WHERE auth_subject IN (?,?))").bind(ownerId,`deleted:${ownerId}`),
    db.prepare(`UPDATE billing_accounts SET auth_subject=?,auth_email=NULL,credit_balance=0,allowance_credits=0,purchased_credits=0,rewarded_ad_credits=0,plan_key='free',subscription_status='canceled',cancel_at_period_end=0,deleted_at=COALESCE(deleted_at,?),updated_at=? WHERE auth_subject IN (?,?)`).bind(`deleted:${ownerId}`,Date.now(),Date.now(),ownerId,`deleted:${ownerId}`),
  ]);
}
export async function deleteAccount(db:D1Database, ownerId:string, services:DeletionServices) {
  const job=await beginAccountDeletion(db,ownerId);
  if(job.state === "complete") return {deleted:true};
  const account=await deletionBilling(db,ownerId);
  if(account && !account.deleted_at) await services.stopBilling(account);
  await services.revokeAuth();
  await purgeAccountContent(db,ownerId);
  if(account) removeAccountArtifacts(account.id);
  // A failed provider deletion is retryable by the dedicated deletion endpoint;
  // ordinary app access stays denied by the durable local deletion marker.
  await services.deleteAuth();
  await db.prepare("UPDATE account_deletions SET state='complete',updated_at=? WHERE owner_id=?").bind(Date.now(),ownerId).run();
  return {deleted:true};
}
