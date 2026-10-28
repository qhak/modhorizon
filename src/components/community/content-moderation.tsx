"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { communityFetch } from "./forms";

export function ReportContent({kind,id}:{kind:"profile"|"comment";id:string}) {
  const [open,setOpen]=useState(false),[reason,setReason]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setNotice("");
    try { await communityFetch("/api/community/reports",{kind,id,reason});setOpen(false);setReason("");setNotice("Report sent to moderators."); }
    catch(error) { setNotice(error instanceof Error?error.message:"Report could not be sent."); }
    finally { setBusy(false); }
  }
  return <div><button className="cm-button cm-button-small" type="button" disabled={busy} onClick={()=>setOpen(value=>!value)}>Report {kind}</button>{open && <form onSubmit={submit} className="cm-comment-form"><textarea aria-label={`Why are you reporting this ${kind}?`} required minLength={10} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Describe the issue for moderators."/><button className="cm-button" disabled={busy}>Send report</button></form>}{notice && <p className="cm-form-hint" role="status">{notice}</p>}</div>;
}
type CommentRow={id:string;post_id:string;text:string;hidden:number;handle:string;display_name:string};
type ProfileRow={handle:string;display_name:string;bio:string;website:string;moderation_status:"active"|"hidden";updated_at:number};
type ReportRow={id:string;target_kind:string;target_id:string;reason:string;reporter_handle:string};
type Queue={comments:CommentRow[];profiles:ProfileRow[];reports:ReportRow[]};
export function ContentModeration() {
  const [data,setData]=useState<Queue|null>(null),[query,setQuery]=useState(""),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
  async function load(search = query) { setBusy(true);setNotice("");try { setData(await communityFetch<Queue>(`/api/community/moderation/content?q=${encodeURIComponent(search)}`)); }catch(error){setNotice(error instanceof Error?error.message:"Could not load content.");}finally{setBusy(false);} }
  async function moderate(body:Record<string,unknown>) {setBusy(true);setNotice("");try{await communityFetch("/api/community/moderation/content",{...body,note},"PATCH");await load();}catch(error){setNotice(error instanceof Error?error.message:"Could not moderate content.");}finally{setBusy(false);} }
  return <section className="cm-moderation"><h2>Profiles and comments</h2><p className="cm-form-hint">Hidden profiles and their work disappear from public pages. Their owners cannot post or edit until restored. Actions are recorded.</p><form className="cm-comment-form" onSubmit={event=>{event.preventDefault();void load();}}><input aria-label="Find profiles or comments" value={query} maxLength={100} onChange={e=>setQuery(e.target.value)} placeholder="Search by handle, name or comment"/><button className="cm-button" disabled={busy}>Load content and reports</button></form><label className="cm-form-hint">Moderation note (optional)<textarea className="cm-moderator-note" value={note} maxLength={500} onChange={e=>setNote(e.target.value)} /></label>{notice&&<p className="cm-notice cm-error" role="alert">{notice}</p>}{data&&<>
    <h3>Open reports</h3>{!data.reports.length&&<p className="cm-form-hint">No open profile or comment reports.</p>}{data.reports.map(report=><article key={report.id} className="cm-side-card"><p className="cm-prose">{report.reason}</p><p className="cm-form-hint">{report.target_kind}: {report.target_id} · reported by @{report.reporter_handle}</p><p className="cm-form-hint">Search the handle or comment text below to review the content before acting.</p><button className="cm-button" disabled={busy} onClick={()=>{setQuery(report.target_id);void load(report.target_id);}}>Review content</button><button className="cm-button" disabled={busy} onClick={()=>void moderate({action:"dismiss_report",id:report.id})}>Dismiss report</button></article>)}
    <h3>Profiles</h3>{data.profiles.map(profile=><article key={profile.handle} className="cm-side-card"><h4>@{profile.handle} · {profile.moderation_status}</h4><p className="cm-prose">{profile.display_name}{"\n"}{profile.bio}{"\n"}{profile.website}</p><button className="cm-button" disabled={busy} onClick={()=>void moderate({kind:"profile",id:profile.handle,updatedAt:profile.updated_at,action:profile.moderation_status==="hidden"?"restore":"hide"})}>{profile.moderation_status==="hidden"?"Restore profile":"Hide profile"}</button></article>)}
    <h3>Comments</h3>{data.comments.map(comment=><article key={comment.id} className="cm-side-card"><p className="cm-form-hint">@{comment.handle} · {comment.hidden?"hidden":"visible"} · {comment.id}</p><p className="cm-prose">{comment.text}</p><Link href={`/showcase/${comment.post_id}/review`} className="cm-inline-link">Showcase →</Link><button className="cm-button" disabled={busy} onClick={()=>void moderate({kind:"comment",id:comment.id,action:comment.hidden?"restore":"hide"})}>{comment.hidden?"Restore comment":"Hide comment"}</button></article>)}
    <p className="cm-form-hint">Up to 100 results per section. Narrow the search to find older content.</p></>}</section>;
}
