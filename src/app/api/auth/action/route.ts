import { accountAppOrigin, accountAuthClient, authConfiguration, verifiedAuthUser } from "@/lib/account-auth";
import { validPassword } from "@/lib/account-auth-policy";
import { hasAllowedOrigin } from "@/lib/request-origin";
import { BILLING_SESSION_COOKIE, revokeBillingSession } from "@/lib/billing-service";
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";
function json(body:unknown,init:ResponseInit={}) {
  const headers=new Headers(init.headers);
  headers.set("Cache-Control","private, no-store");
  return Response.json(body,{...init,headers});
}
export async function POST(request:Request) {
  if (!request.headers.get("origin") || !hasAllowedOrigin(request)) return json({error:"A same-origin request is required."},{status:403});
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase()!=="application/json") return json({error:"A JSON request is required."},{status:415});
  if (Number(request.headers.get("content-length")) > 4096) return json({error:"Request is too large."},{status:413});
  try {
    const body = await request.text();
    if (body.length > 4096) return json({error:"Request is too large."},{status:413});
    let payload:unknown;
    try { payload=JSON.parse(body); } catch { return json({error:"Invalid JSON."},{status:400}); }
    if (!payload || typeof payload!=="object" || Array.isArray(payload)) return json({error:"Invalid account request."},{status:400});
    const {action,email:rawEmail,password} = payload as {action:unknown;email?:unknown;password?:unknown};
    if(typeof action!=="string" || !["signup","login","forgot","update-password","google","logout"].includes(action))return json({error:"Unknown account action."},{status:400});
    const client = await accountAuthClient();
    const origin = await accountAppOrigin(request);
    const email = typeof rawEmail === "string" ? rawEmail.trim() : "";
    if (["signup","login","forgot"].includes(action) && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254)) return json({error:"Enter a valid email address."},{status:400});
    if (["signup","update-password"].includes(action) && (typeof password !== "string" || !validPassword(password))) return json({error:"Use a password between 12 and 128 characters."},{status:400});
    if (action === "signup") {
      const {error} = await client.auth.signUp({email,password:password as string,options:{emailRedirectTo:`${origin}/auth/callback`}});
      if (error && error.status===429) return json({error:"Too many attempts. Please wait before trying again."},{status:429});
      if (error) return json({error:"Signup could not be completed. Try again later, or sign in if you already have an account."},{status:error.status && error.status>=500?503:400});
      // Generic response avoids exposing whether an address already has an account.
      return json({message:"If signup is available for this address, check your email to confirm your account."});
    }
    if (action === "login") {
      if (typeof password !== "string" || password.length>128) return json({error:"Enter your password."},{status:400});
      const {error} = await client.auth.signInWithPassword({email,password});
      if (error) return json({error:"Sign-in failed. Check your details and confirm your email first."},{status:401});
      if (!await verifiedAuthUser()) { await client.auth.signOut(); return json({error:"Confirm your email before signing in."},{status:403}); }
      return json({redirect:"/account"});
    }
    if (action === "forgot") {
      const {error} = await client.auth.resetPasswordForEmail(email,{redirectTo:`${origin}/auth/callback?next=reset`});
      if (error) return json({error:"A reset email could not be sent. Please wait and try again."},{status:error.status===429?429:503});
      return json({message:"If an account exists, a password reset link will be sent. Check your email."});
    }
    if (action === "update-password") {
      if (!await verifiedAuthUser()) return json({error:"Open the password reset link from your email first."},{status:401});
      const {error} = await client.auth.updateUser({password:password as string});
      if (error) return json({error:"Could not update the password. Try a new reset link or a different password."},{status:400});
      return json({message:"Password updated."});
    }
    if (action === "google") {
      if (!(await authConfiguration()).googleEnabled) return json({error:"Google sign-in is not configured yet."},{status:503});
      const {data,error} = await client.auth.signInWithOAuth({provider:"google", options:{redirectTo:`${origin}/auth/callback`,skipBrowserRedirect:true}});
      if (error || !data.url) return json({error:"Google sign-in is unavailable."},{status:503});
      return json({redirect:data.url});
    }
    if (action === "logout") {
      const {error} = await client.auth.signOut({scope:"local"});
      if (error) return json({error:"Could not sign out. Please try again."},{status:503});
      await revokeBillingSession(request);
      (await cookies()).set(BILLING_SESSION_COOKIE,"",{path:"/",httpOnly:true,sameSite:"strict",maxAge:0,secure:new URL(request.url).protocol==="https:"});
      return json({redirect:"/account"});
    }
    return json({error:"Unknown account action."},{status:400});
  } catch { return json({error:"Account service unavailable. Please try again later."},{status:503,headers:{"Cache-Control":"no-store"}}); }
}
