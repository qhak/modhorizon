import { createClient } from "@supabase/supabase-js";
import { accountAuthClient, authEnvironment } from "./account-auth";
import { confirmedAccountUser } from "./account-auth-policy";
import { recentDeletionSignIn } from "./account-deletion";
import { CommunityError } from "./community";

export type DeletionEnvironment = { SUPABASE_URL?:string; SUPABASE_SECRET_KEY?:string; ACCOUNT_DELETION_ENABLED?:string; ALLOW_LOCAL_ACCOUNT_DELETION?:string; STRIPE_SECRET_KEY?:string };
export function deletionConfigured(env:DeletionEnvironment, production = process.env.NODE_ENV === "production") {
  return env.ACCOUNT_DELETION_ENABLED === "true" && (production || env.ALLOW_LOCAL_ACCOUNT_DELETION === "true") && !!env.SUPABASE_URL?.startsWith("https://") && !!env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_");
}
export async function deletionIdentity(fresh=false) {
  const client=await accountAuthClient();
  const {data:sessionData,error:sessionError}=await client.auth.getSession();
  const token=sessionData.session?.access_token;
  if(sessionError || !token) throw new CommunityError("Sign in before deleting your account.",401);
  // getSession is only a transport for the token. Identity comes from getUser;
  // the same token's cryptographically verified AMR establishes recent sign-in.
  const {data,error}=await client.auth.getUser(token), user=confirmedAccountUser(data.user);
  if(error || !user) throw new CommunityError("Sign in with a confirmed account.",401);
  if(fresh) {
    const result=await client.auth.getClaims(token);
    if(result.error || !result.data || !recentDeletionSignIn(result.data.claims,user.id))
      throw new CommunityError("Sign out and sign back in, then delete your account within 10 minutes.",403);
  }
  return {user,token,client};
}
export async function deletionEnvironment() { return await authEnvironment() as DeletionEnvironment; }
export function deletionAuthServices(env:DeletionEnvironment, userId:string, token:string) {
  if(!deletionConfigured(env)) throw new CommunityError("Account deletion is not enabled on this environment.",503);
  const admin=createClient(env.SUPABASE_URL!,env.SUPABASE_SECRET_KEY!,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:(input,init)=>fetch(input,{...init,redirect:"error",signal:AbortSignal.timeout(20_000)})},
  });
  return {
    async revokeAuth() {
      const {error}=await admin.auth.admin.signOut(token,"global");
      if(error && error.status!==404) throw new CommunityError("Session revocation failed. Deletion is paused; please retry.",503);
    },
    async deleteAuth() {
      const {error}=await admin.auth.admin.deleteUser(userId,false);
      if(error && error.code!=="user_not_found") throw new CommunityError("Sign-in removal could not finish. Please return to this deletion page and retry.",503);
    },
  };
}
