"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, Plus, ShieldCheck } from "lucide-react";
import type { CommunityPost, CommunityProfile } from "@/lib/community";
import { MINECRAFT_VERSIONS } from "@/lib/types";
import { KIND_SINGULAR, CreatorAvatar, showcaseHref } from "./cards";

type Me = { profile: CommunityProfile | null; posts: CommunityPost[]; isModerator: boolean };
export async function communityFetch<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(path, body === undefined ? { cache: "no-store" } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The community service is unavailable. Please try again.");
  return data as T;
}

function SignIn({ error = "Sign in to create a public profile and share your work." }: { error?: string }) {
  return <section className="cm-signin"><span className="cm-eyebrow">YOUR CREATOR SPACE</span><h1 style={{ marginTop: 14 }}>Sign in to share projects</h1><p>{error}</p><Link href="/account" className="cm-button cm-button-primary">Sign in or create an account <ArrowRight size={14} /></Link><p style={{ marginTop: 18, marginBottom: 0 }}>You can browse the community without signing in.</p></section>;
}

function useCommunityMe() {
  const [me, setMe] = useState<Me | null>(null), [error, setError] = useState("");
  useEffect(() => { let live = true; communityFetch<Me>("/api/community/me").then(data => { if (live) setMe(data); }).catch(e => { if (live) setError(e.message); }); return () => { live = false; }; }, []);
  return { me, setMe, error };
}

export function ProfileEditor() {
  const { me, setMe, error } = useCommunityMe();
  const [handle, setHandle] = useState(""), [displayName, setDisplayName] = useState(""), [bio, setBio] = useState(""), [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(""), [saved, setSaved] = useState(false);
  useEffect(() => { if (me?.profile) { const p = me.profile; setHandle(p.handle); setDisplayName(p.displayName); setBio(p.bio); setWebsite(p.website); } }, [me]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setNotice(""); setSaved(false);
    try {
      const result = await communityFetch<{ profile: CommunityProfile }>("/api/community/profile", { handle, displayName, bio, website }, "PATCH");
      setMe(current => current ? { ...current, profile: result.profile } : current);
      setSaved(true); setNotice("Your public profile has been saved.");
    }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not save your profile."); }
    finally { setBusy(false); }
  }
  if (error) return <SignIn error={error} />;
  if (!me) return <p className="cm-notice" role="status">Loading your creator profile…</p>;
  return <><header className="cm-form-heading"><span className="cm-eyebrow">YOUR PUBLIC PROFILE</span><h1>Edit your public profile</h1><p>Choose how you appear in the community. Your account email, private projects, prompts, and build logs are never added to your public profile.</p></header>
    <div className="cm-form-layout"><form className="cm-form" onSubmit={submit}>
      <div className="cm-form-columns"><label>Creator handle<input value={handle} disabled={busy || !!me.profile} onChange={e => setHandle(e.target.value.toLowerCase())} required pattern="[a-z][a-z0-9_]{2,23}" minLength={3} maxLength={24} placeholder="your_creator_name" /><span>{me.profile ? "Your permanent public profile address." : "3–24 lowercase letters, numbers or underscores, starting with a letter. Your handle cannot be changed after creation."}</span></label>
      <label>Display name<input value={displayName} onChange={e => setDisplayName(e.target.value)} required minLength={2} maxLength={60} placeholder="What should we call you?" disabled={busy} /></label></div>
      <label>About you<textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={280} placeholder="What do you like making in Minecraft?" disabled={busy} /><span>{bio.length}/280 characters · This is public.</span></label>
      <label>Website <span>Optional. A public HTTPS link.</span><input type="url" value={website} onChange={e => setWebsite(e.target.value)} maxLength={300} placeholder="https://" disabled={busy} /></label>
      {notice && <p className={`cm-notice ${saved ? "" : "cm-error"}`} role="status">{notice} {saved && <Link href={`/creators/${handle}`} className="cm-inline-link">View your profile →</Link>}</p>}
      <div className="cm-form-actions"><button className="cm-button cm-button-primary" disabled={busy}>{busy ? <LoaderCircle size={14} /> : <Check size={14} />}Save public profile</button><Link href="/community" className="cm-button">Back to creator space</Link></div>
    </form><aside className="cm-form-aside"><div className="cm-side-card"><ShieldCheck size={21} color="#8caada" /><h2>What’s public?</h2><p className="cm-form-hint">Only the fields you save here appear on your profile. Creating a profile does not publish anything from your workspace.</p><p className="cm-form-hint">Showcases are reviewed before appearing in Explore or becoming eligible for search indexing.</p></div></aside></div></>;
}

async function screenshotData(file: File): Promise<string> {
  if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Choose a PNG or JPEG screenshot under 8 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("That image could not be opened.")); image.src = url; });
    if (image.naturalWidth * image.naturalHeight > 33_000_000) throw new Error("Choose a screenshot smaller than 33 megapixels.");
    const scale = Math.min(1, 1920 / image.naturalWidth, 1080 / image.naturalHeight);
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Image processing is unavailable in this browser.");
    ctx.fillStyle = "#0a0a0d"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", .82);
    if (result.length > 1_040_000) throw new Error("That screenshot is still too large after resizing. Try a smaller crop.");
    return result;
  } finally { URL.revokeObjectURL(url); }
}

const DEFAULT_TARGET: Record<string, string> = { plugin: "paper", mod: "fabric", resource_pack: "vanilla", shader_pack: "iris", datapack: "vanilla" };
const TARGETS: Record<string, string[]> = { plugin: ["paper", "spigot", "bukkit", "purpur", "folia", "velocity", "bungeecord", "sponge"], mod: ["fabric", "quilt", "forge", "neoforge"], resource_pack: ["vanilla"], shader_pack: ["iris", "optifine"], datapack: ["vanilla"] };
export function PublishEditor() {
  const { me, error } = useCommunityMe();
  const [editId, setEditId] = useState(""), [title, setTitle] = useState(""), [summary, setSummary] = useState(""), [description, setDescription] = useState(""), [instructions, setInstructions] = useState("");
  const [kind, setKind] = useState("plugin"), [target, setTarget] = useState("paper"), [version, setVersion] = useState("1.21.4"), [tags, setTags] = useState(""), [coverImage, setCoverImage] = useState(""), [downloadUrl, setDownloadUrl] = useState(""), [testing, setTesting] = useState("untested"), [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false), [uploading, setUploading] = useState(false), [notice, setNotice] = useState(""), [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!me) return;
    const id = new URLSearchParams(window.location.search).get("edit");
    if (id) {
      const post = me.posts.find(p => p.id === id);
      if (!post) { setNotice("That showcase is unavailable in your creator space."); return; }
      setEditId(post.id); setTitle(post.title); setSummary(post.summary); setDescription(post.description); setInstructions(post.instructions); setKind(post.kind); setTarget(post.target); setVersion(post.version); setTags(post.tags.join(", ")); setCoverImage(post.coverImage); setDownloadUrl(post.downloadUrl); setTesting(post.testing);
    } else {
      try { const raw = sessionStorage.getItem("modhorizon-community-prefill"); if (raw) { const p = JSON.parse(raw); if (typeof p.title === "string") setTitle(p.title.slice(0, 100)); if (Object.hasOwn(DEFAULT_TARGET, p.kind)) { setKind(p.kind); setTarget(typeof p.target === "string" ? p.target : DEFAULT_TARGET[p.kind]); } if (typeof p.version === "string" && MINECRAFT_VERSIONS.includes(p.version)) setVersion(p.version); sessionStorage.removeItem("modhorizon-community-prefill"); } } catch { /* Ignore unusable local prefill, never publish it. */ }
    }
  }, [me]);
  async function upload(file?: File) {
    if (!file) return; setUploading(true); setNotice(""); setSuccess(false);
    try { const result = await communityFetch<{ url: string }>("/api/community/media", { dataUrl: await screenshotData(file) }); setCoverImage(result.url); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Screenshot upload failed."); }
    finally { setUploading(false); }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const review = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "review";
    if (review && !confirmed) { setNotice("Confirm that the showcase fields and screenshot may be public before submitting."); return; }
    setBusy(true); setNotice(""); setSuccess(false);
    try {
      const result = await communityFetch<{ post: CommunityPost }>(`/api/community/posts${editId ? `/${editId}` : ""}`, { title, summary, description, instructions, kind, target, version, tags: tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean), coverImage, downloadUrl, testing, submitForReview: review }, editId ? "PATCH" : "POST");
      setEditId(result.post.id); setSuccess(true); setConfirmed(false); setNotice(review ? "Submitted for review. Your showcase stays out of Explore and search until it is approved." : "Draft saved. Only you can see it in your creator space.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save this showcase."); }
    finally { setBusy(false); }
  }
  if (error) return <SignIn error={error} />;
  if (!me) return <p className="cm-notice" role="status">Loading your creator space…</p>;
  if (!me.profile) return <section className="cm-signin"><h1>Create your profile first</h1><p>Choose your public handle and display name before saving or sharing a showcase.</p><Link href="/community/profile" className="cm-button cm-button-primary">Create your public profile <ArrowRight size={14} /></Link></section>;
  return <><header className="cm-form-heading"><Link href="/community" className="cm-inline-link"><ArrowLeft size={12} />Creator space</Link><span className="cm-eyebrow" style={{ marginTop: 22 }}>SHARE A PROJECT</span><h1>{editId ? "Edit your showcase" : "New showcase"}</h1><p>Share the idea, the details, and what you have actually tested. Your private workspace source, prompts, logs, and account details are not copied here.</p></header>
    <div className="cm-form-layout"><form className="cm-form" onSubmit={submit}>
      <label>Showcase title<input required minLength={5} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Give your creation a clear, descriptive name" disabled={busy} /></label>
      <label>Short introduction<textarea required minLength={40} maxLength={240} value={summary} onChange={e => setSummary(e.target.value)} placeholder="What did you build, and who is it for?" disabled={busy} style={{ minHeight: 85 }} /><span>{summary.length}/240 characters · At least 40 characters.</span></label>
      <div className="cm-form-columns cm-three"><label>Project type<select value={kind} onChange={e => { setKind(e.target.value); setTarget(DEFAULT_TARGET[e.target.value]); }} disabled={busy}>{Object.entries(KIND_SINGULAR).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label>Loader / target<select value={target} onChange={e => setTarget(e.target.value)} disabled={busy}>{(TARGETS[kind] || []).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
        <label>Minecraft version<select value={version} onChange={e => setVersion(e.target.value)} disabled={busy}>{[...MINECRAFT_VERSIONS].reverse().map(v => <option key={v} value={v}>{v}</option>)}</select></label></div>
      <label>About this creation<textarea required minLength={120} maxLength={6000} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explain its features, how you made it, and any limitations people should know about." disabled={busy} /><span>{description.length}/6,000 characters · At least 120 characters. Plain text.</span></label>
      <label>Setup and usage<textarea value={instructions} onChange={e => setInstructions(e.target.value)} maxLength={4000} placeholder="Describe installation requirements and how someone would use it. This showcase does not host binary downloads yet." disabled={busy} /></label>
      <label>Creator download page <span>Optional. Link a release on GitHub, Modrinth or CurseForge. Downloads are hosted externally.</span><input type="url" value={downloadUrl} onChange={e => setDownloadUrl(e.target.value)} maxLength={500} placeholder="https://modrinth.com/…" disabled={busy} /></label>
      <label>Cover screenshot <span>Optional. Upload your own PNG or JPEG. We resize it for the gallery. It stays private until the showcase is published.</span><input type="file" accept="image/png,image/jpeg" disabled={busy || uploading} onChange={e => void upload(e.target.files?.[0])} />{uploading && <span className="cm-upload-help"><LoaderCircle size={13} />Preparing screenshot…</span>}</label>
      {coverImage && <><img className="cm-cover-preview" src={coverImage} alt="Your showcase cover preview" /><button type="button" className="cm-button cm-button-small" onClick={() => setCoverImage("")} disabled={busy}>Remove screenshot</button></>}
      <div className="cm-form-columns" style={{ marginTop: coverImage ? 20 : 0 }}><label>Tags<input value={tags} onChange={e => setTags(e.target.value)} maxLength={120} placeholder="survival, tools, movement" disabled={busy} /><span>Up to five tags, separated by commas.</span></label>
        <label>Testing status<select value={testing} onChange={e => setTesting(e.target.value)} disabled={busy}><option value="untested">Not tested in-game</option><option value="creator-tested">I tested it in-game</option></select><span>Your own report, not a ModHorizon verification badge.</span></label></div>
      <label className="cm-form-check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy} /><span style={{ margin: 0, fontSize: 11, color: "#a7adbd" }}>I want these showcase fields and this screenshot to be public after review. I have permission to share them. My private workspace files will remain private.</span></label>
      {notice && <p className={`cm-notice ${success ? "" : "cm-error"}`} role="status">{notice} {success && <Link href="/community">Back to creator space →</Link>}</p>}
      <div className="cm-form-actions"><button name="intent" value="draft" className="cm-button" disabled={busy || uploading}>Save draft</button><button name="intent" value="review" className="cm-button cm-button-primary" disabled={busy || uploading || !confirmed}>{busy ? <LoaderCircle size={14} /> : <ArrowRight size={14} />}Submit for review</button></div>
    </form><aside className="cm-form-aside"><div className="cm-side-card"><ImagePlus size={21} color="#8caada" /><h2>What to include</h2><p className="cm-form-hint">Show real screenshots. Explain the Minecraft version and loader. Be specific about what works, what you tested, and what is still experimental.</p><p className="cm-form-hint">New and edited submissions are reviewed before appearing publicly. Saving a draft does not publish it.</p><p className="cm-form-hint">Add a GitHub, Modrinth or CurseForge link for downloads. File uploads and remixing are not available yet.</p></div></aside></div></>;
}

export function CreatorManager() {
  const { me, setMe, error } = useCommunityMe(); const [notice, setNotice] = useState(""), [busy, setBusy] = useState("");
  async function remove(post: CommunityPost) {
    if (!window.confirm(`Return “${post.title}” to a private draft?`)) return;
    setBusy(post.id); setNotice("");
    try { await communityFetch(`/api/community/posts/${post.id}`, {}, "DELETE"); setMe(current => current ? { ...current, posts: current.posts.map(item => item.id === post.id ? { ...item, status: "draft" as const } : item) } : null); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Could not remove the showcase."); }
    finally { setBusy(""); }
  }
  if (error) return <SignIn error={error} />;
  if (!me) return <p className="cm-notice" role="status">Loading your creator space…</p>;
  return <><header className="cm-hero"><div><span className="cm-eyebrow">YOUR PROJECTS</span><h1>Your showcases</h1><p>Manage your drafts, submissions and published projects.</p></div><Link href="/community/new" className="cm-button cm-button-primary"><Plus size={15} />New showcase</Link></header>
    {me.profile ? <section className="cm-manager-profile"><CreatorAvatar name={me.profile.displayName} /><div><h2>{me.profile.displayName}</h2><p>@{me.profile.handle}</p></div><Link className="cm-button cm-button-small" href={`/creators/${me.profile.handle}`}>Public profile</Link><Link className="cm-button cm-button-small" href="/community/profile">Edit profile</Link></section> : <p className="cm-notice">Set up a profile to share projects. <Link href="/community/profile">Set up your profile →</Link></p>}
    <div className="cm-section-label"><h2>Your showcases</h2><span>{me.posts.length} saved</span></div>
    {notice && <p className="cm-notice cm-error" role="alert">{notice}</p>}
    {!me.posts.length && <section className="cm-empty"><ImagePlus size={31} /><h2>No showcases yet</h2><p>Add a project to your profile. Workspace projects stay private until you share them.</p><Link className="cm-button" href="/community/new">Start a showcase <ArrowRight size={14} /></Link></section>}
    {me.posts.map(post => <article key={post.id} className="cm-manager-row"><div><h3>{post.title}</h3><div className="cm-manager-row-meta"><span className="cm-status">{post.status}</span><p>{KIND_SINGULAR[post.kind]} · {post.version}</p></div></div><div className="cm-manager-row-actions">{post.status === "published" && <Link className="cm-button cm-button-small" href={showcaseHref(post)}>View</Link>}{post.status === "hidden" ? <span className="cm-form-hint">Editing restricted by moderation</span> : <><Link className="cm-button cm-button-small" href={`/community/new?edit=${post.id}`}>Edit</Link><button className="cm-button cm-button-small" disabled={!!busy} onClick={() => void remove(post)}>{busy === post.id ? "Withdrawing…" : "Unpublish"}</button></>}</div></article>)}
    <p className="cm-form-hint" style={{ marginTop: 20 }}>Editing a published showcase sends it back to review and temporarily removes it from public pages and search eligibility.</p>
    {me.isModerator && <p className="cm-notice"><Link href="/community/moderation">Open the moderation queue →</Link></p>}
  </>;
}
