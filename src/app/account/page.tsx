"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import "./account.css";
import BillingDashboard from "./billing-dashboard";

type AuthStatus = { configured:boolean; googleEnabled:boolean; user:{id:string;email:string}|null };
export default function AccountPage() {
  const [status,setStatus] = useState<AuthStatus|null>(null);
  const [mode,setMode] = useState("login");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [notice,setNotice] = useState("");
  const [busy,setBusy] = useState(false);
  useEffect(()=>{
    const query = new URLSearchParams(window.location.search);
    if(query.get("mode")==="reset")setMode("reset");
    if(query.get("error"))setNotice("That sign-in link could not be used. Please try again or request a new link.");
    fetch("/api/auth/status",{cache:"no-store"}).then(async res=>{if(!res.ok)throw new Error();return res.json();}).then(async data=>{
      if(data.user){
        const linked=await fetch("/api/billing/session",{method:"POST"});
        if(!linked.ok)setNotice("You are signed in, but your credit balance could not be loaded. Please refresh before purchasing.");
      }
      setStatus(data);
    }).catch(()=>setNotice("Account service unavailable. Please refresh to try again."));
  },[]);
  async function action(name:string) {
    setBusy(true);setNotice("");
    try {
      const response = await fetch("/api/auth/action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:name,email,password})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Please try again.");
      setPassword("");
      if(data.redirect){window.location.assign(data.redirect);return;}
      setNotice(data.message);
    }catch(error){setNotice(error instanceof Error?error.message:"Please try again.");}
    finally{setBusy(false);}
  }
  async function portal(){
    setBusy(true);setNotice("");
    try {const res=await fetch("/api/billing/portal",{method:"POST"});const data=await res.json();if(!res.ok||!data.url)throw new Error(data.error||"Billing portal unavailable.");window.location.assign(data.url);}
    catch(error){setNotice(error instanceof Error?error.message:"Billing portal unavailable.");setBusy(false);}
  }
  function submit(event:FormEvent){event.preventDefault();void action(mode==="reset"?"update-password":mode);}
  return <main className="account-shell"><nav><Link href="/">← ModHorizon</Link><Link href="/pricing">Plans & credits</Link></nav>
    <section className="account-card"><div className="account-eyebrow">YOUR WORKSPACE</div><h1>{status?.user&&mode!=="reset"?"Your account":mode==="signup"?"Create your account":mode==="forgot"?"Reset your password":mode==="reset"?"Choose a new password":"Welcome back"}</h1>
      <p className="account-intro">Keep your plan and credits connected across devices.</p>
      {notice&&<p className="account-notice" role="status">{notice}</p>}
      {!status?<p>Loading account…</p>:!status.configured?<p className="account-notice">Account sign-in is being set up. Please check back shortly.</p>:status.user&&mode!=="reset"?<>
        <p className="account-email">{status.user.email}</p><p className="account-intro">Your email is verified. Monthly credits reset on renewal; purchased top-ups carry over.</p>
        <BillingDashboard />
        <Link className="account-primary" href="/pricing">View plan & buy credits</Link>
        <button className="account-secondary" disabled={busy} onClick={()=>void portal()}>Manage subscription</button>
        <button className="account-text" disabled={busy} onClick={()=>{setMode("forgot");setEmail(status.user!.email);}}>Send password reset email</button>
        <button className="account-text" disabled={busy} onClick={()=>void action("logout")}>Sign out</button>
        {mode==="forgot"&&<button className="account-secondary" disabled={busy} onClick={()=>void action("forgot")}>Send reset link to {email}</button>}
      </>:<>
        {mode!=="forgot"&&mode!=="reset"&&<><button className="account-secondary" disabled={busy||!status.googleEnabled} onClick={()=>void action("google")}>{status.googleEnabled?"Continue with Google":"Google sign-in coming soon"}</button><div className="account-divider">or use email</div></>}
        <form onSubmit={submit}>
          {mode!=="reset"&&<label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>}
          {mode!=="forgot"&&<label>Password<input name="password" type="password" autoComplete={mode==="login"?"current-password":"new-password"} required minLength={mode==="login"?1:12} maxLength={128} value={password} onChange={event=>setPassword(event.target.value)}/>{mode!=="login"&&<small>Use at least 12 characters.</small>}</label>}
          <button className="account-primary" disabled={busy}>{busy?"Please wait…":mode==="signup"?"Create account":mode==="forgot"?"Send reset link":mode==="reset"?"Save new password":"Sign in"}</button>
        </form>
        <div className="account-links">{mode==="login"?<><button onClick={()=>{setMode("signup");setNotice("");}}>Create an account</button><button onClick={()=>{setMode("forgot");setNotice("");}}>Forgot password?</button></>:<button onClick={()=>{setMode("login");setNotice("");}}>Back to sign in</button>}</div>
        {mode==="signup"&&<p className="account-fine">We’ll email you a confirmation link. Open it in this browser to keep your existing credits.</p>}
      </>}
    </section></main>;
}
