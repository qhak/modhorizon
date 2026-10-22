import type { D1Database } from "./billing-db";

export async function authorizedBillingAccountId(db:D1Database, user:{id:string;email:string}|null, browserAccount:{id:string;auth_subject:string|null}|null):Promise<string|null> {
  if (!user) {
    if (!browserAccount || browserAccount.auth_subject) return null;
    // Recheck after auth verification: the browser account may have been claimed meanwhile.
    return (await db.prepare("SELECT id FROM billing_accounts WHERE id=? AND auth_subject IS NULL").bind(browserAccount.id).first<{id:string}>())?.id ?? null;
  }
  return resolveAccountIdentity(db,user,browserAccount && !browserAccount.auth_subject ? browserAccount.id : null);
}
/** Claim an existing browser-owned guest account once. Never merge signed-in accounts or balances. */
export async function resolveAccountIdentity(db: D1Database, user: { id: string; email: string }, guestAccountId: string | null): Promise<string | null> {
  const existing = await db.prepare("SELECT id FROM billing_accounts WHERE auth_subject=?").bind(user.id).first<{id:string}>();
  if (existing) return existing.id;
  if (!guestAccountId) return null;
  // Unique index arbitrates concurrent first sign-ins; compare-and-set prevents reassignment.
  await db.prepare(`UPDATE billing_accounts SET auth_subject=?,auth_email=?,updated_at=? WHERE id=? AND auth_subject IS NULL
    AND NOT EXISTS(SELECT 1 FROM billing_accounts WHERE auth_subject=?)`).bind(user.id,user.email,Date.now(),guestAccountId,user.id).run();
  return (await db.prepare("SELECT id FROM billing_accounts WHERE auth_subject=?").bind(user.id).first<{id:string}>())?.id ?? null;
}
