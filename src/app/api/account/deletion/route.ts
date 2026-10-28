import { cookies } from "next/headers";
import { billingEnv, BILLING_SESSION_COOKIE } from "@/lib/billing-service";
import { CommunityError } from "@/lib/community";
import { communityBody, communityResponse, requireCommunityOrigin } from "@/lib/community-access";
import { deleteAccount, deletionBilling } from "@/lib/account-deletion";
import { deletionConfigured, deletionEnvironment, deletionIdentity, deletionAuthServices } from "@/lib/account-deletion-provider";
import { stopAccountBilling } from "@/lib/account-deletion-billing";
import { stripeMode } from "@/lib/stripe-config";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET() { return communityResponse(async()=>{
  const {user}=await deletionIdentity(), env=await deletionEnvironment(), {BILLING_DB:db}=await billingEnv();
  if(!db) throw new CommunityError("Account storage is unavailable.",503);
  const pending=await db.prepare("SELECT state FROM account_deletions WHERE owner_id=?").bind(user.id).first();
  const account=await deletionBilling(db,user.id);
  return {enabled:deletionConfigured(env) && (!account || !!stripeMode(env.STRIPE_SECRET_KEY)),pending:!!pending,email:user.email};
}); }
export async function POST(request:Request) { return communityResponse(async()=>{
  requireCommunityOrigin(request);
  const body=await communityBody(request);
  if(body.confirmation!=="DELETE" || body.acknowledge!==true) throw new CommunityError("Type DELETE and confirm the deletion details.");
  const env=await deletionEnvironment();
  if(!deletionConfigured(env)) throw new CommunityError("Account deletion is not enabled on this environment.",503);
  const {user,token,client}=await deletionIdentity(true), {BILLING_DB:db}=await billingEnv();
  if(!db) throw new CommunityError("Account storage is unavailable.",503);
  const account=await deletionBilling(db,user.id);
  if(account && !stripeMode(env.STRIPE_SECRET_KEY)) throw new CommunityError("Billing cancellation is not configured. Your account has not been changed.",503);
  const result=await deleteAccount(db,user.id,{...deletionAuthServices(env,user.id,token),stopBilling:account=>stopAccountBilling(env.STRIPE_SECRET_KEY,account)});
  // Provider deletion and the app tombstone are authoritative; clearing this
  // browser is best-effort after deletion has completed, not its success signal.
  try { await client.auth.signOut({scope:"local"}); } catch { /* Deleted user. */ }
  (await cookies()).set(BILLING_SESSION_COOKIE,"",{path:"/",maxAge:0,httpOnly:true,sameSite:"strict",secure:new URL(request.url).protocol==="https:"});
  return result;
}); }
