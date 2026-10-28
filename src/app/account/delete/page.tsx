"use client";
import { useEffect,useState,type FormEvent } from "react";
import Link from "next/link";
import "../account.css";
import { VoidBackdrop } from "@/components/void-backdrop";
type Status={enabled:boolean;pending:boolean;email:string};
export default function DeleteAccountPage() {
  const [status,setStatus]=useState<Status|null>(null),[confirmation,setConfirmation]=useState(""),[acknowledge,setAcknowledge]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[deleted,setDeleted]=useState(false);
  useEffect(()=>{fetch("/api/account/deletion",{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);setStatus(data);}).catch(error=>setNotice(error instanceof Error?error.message:"Deletion settings could not be loaded."));},[]);
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setNotice("");
    try {const response=await fetch("/api/account/deletion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmation,acknowledge})});const data=await response.json();if(!response.ok)throw new Error(data.error);setDeleted(true);try{sessionStorage.removeItem("modhorizon-community-prefill");}catch{/* Browser storage may be unavailable. */}}
    catch(error){setNotice(error instanceof Error?error.message:"Deletion could not finish. Retry from this page.");}finally{setBusy(false);}
  }
  return <main className="account-shell"><VoidBackdrop/><nav><Link href="/account">← Account</Link><Link href="/">ModHorizon</Link></nav><section className="account-card"><div className="account-eyebrow">ACCOUNT SETTINGS</div><h1>{deleted?"Account deleted":"Delete your account"}</h1>{deleted?<><p>Your sign-in and community content have been removed.</p><Link className="account-primary" href="/">Return home</Link></>:<>
    <p className="account-intro">This permanently removes your public profile, showcases, screenshots, comments, likes and follows. It also removes your sign-in and revokes access on other devices.</p>
    <p className="account-intro">Active ModHorizon subscriptions are canceled immediately. Unused credits and remaining paid access are forfeited; no automatic refund is issued. Billing records and a minimal deletion/access marker are retained. Downloaded files, browser-local drafts, and the separate local development project library are not removed.</p>
    {status&&<p className="account-intro">Account: {status.email}</p>}{status?.pending&&<p className="account-notice">Deletion has started. App access is blocked while it finishes. You can retry here after signing in again.</p>}
    {status&&!status.enabled&&<p className="account-notice">Self-service deletion is not enabled in this environment. No account data will be removed by this form.</p>}
    {notice&&<p className="account-notice" role="alert">{notice}</p>}
    {!status&&!notice&&<p>Loading deletion settings…</p>}
    <form onSubmit={submit}><label>Type DELETE to confirm<input value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" disabled={busy||!status?.enabled} /></label><label className="deletion-checkbox"><input type="checkbox" checked={acknowledge} onChange={e=>setAcknowledge(e.target.checked)} disabled={busy||!status?.enabled}/><span>I understand what will be removed, the billing consequences and what remains.</span></label><p className="account-fine">Sign out and sign back in first. Deletion requires authentication within the last 10 minutes.</p><button className="account-primary account-danger" disabled={busy||!status?.enabled||confirmation!=="DELETE"||!acknowledge}>{busy?"Deleting…":status?.pending?"Retry account deletion":"Permanently delete account"}</button></form><Link className="account-text" href="/account">Back to account</Link>
  </>}</section></main>;
}
