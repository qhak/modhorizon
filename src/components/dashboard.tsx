"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Blocks, Check, ChevronDown, Coins, FileCode2, Folder, FolderOpen, Grid2X2, LayoutDashboard, List, LoaderCircle, LogOut, Menu, MoreHorizontal, Plus, Search, Settings2, ShieldCheck, Star, Terminal, X } from "lucide-react";
import { CreditBalance } from "./credit-balance";
import type { LocalProfile, ManagedProject } from "@/lib/managed-project";
import { MINECRAFT_VERSIONS, type ArtifactTarget, type ArtifactType, type Project } from "@/lib/types";

export type DashboardScreen = "home" | "projects" | "new" | "credits" | "settings";
const titles = { home: "Dashboard", projects: "My projects", new: "New project", credits: "Credits", settings: "Settings" };
const links = [ ["home", "/dashboard", LayoutDashboard], ["projects", "/dashboard/projects", Folder], ["new", "/dashboard/new", Plus], ["credits", "/dashboard/credits", Coins], ["settings", "/dashboard/settings", Settings2] ] as const;
const PROJECT_TYPES: { id: ArtifactType; label: string }[] = [
  { id: "plugin", label: "Server plugin" }, { id: "mod", label: "Minecraft mod" },
  { id: "resource_pack", label: "Resource pack" }, { id: "shader_pack", label: "Shader pack" },
];
const PROJECT_TARGETS: Record<ArtifactType, { id: ArtifactTarget; label: string }[]> = {
  plugin: [{ id: "paper", label: "Paper" }],
  mod: [{ id: "fabric", label: "Fabric" }, { id: "forge", label: "Minecraft Forge" }, { id: "neoforge", label: "NeoForge" }],
  resource_pack: [{ id: "vanilla", label: "Vanilla resource pack" }],
  shader_pack: [{ id: "iris", label: "Iris" }, { id: "optifine", label: "OptiFine" }],
};
const projectTypeName = (kind: ArtifactType) => PROJECT_TYPES.find((type) => type.id === kind)?.label || "Minecraft project";
const projectTargetName = (project: Pick<ManagedProject, "kind" | "platform">) => PROJECT_TARGETS[project.kind]?.find((target) => target.id === project.platform)?.label || project.platform;
export async function libraryFetch(path: string, options?: RequestInit) {
  const response = await fetch(`/api/library/${path}`, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

export function LocalAccess({ available }: { available: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <main className="db-access"><Link href="/" className="db-brand"><Blocks size={24} />ModHorizon</Link><div className="db-access-panel"><ShieldCheck size={27} /><span className="db-eyebrow">YOUR DEVELOPMENT SPACE</span><h1>{available ? "Open your local dashboard." : "Account access is not connected yet."}</h1><p>{available ? "Manage projects saved on this computer. This is a single-user local workspace; online accounts and credit balances are not connected." : "The hosted dashboard requires account authentication and a durable hosted database. Continue using the existing preview while those services are connected."}</p>{error && <p role="alert" className="db-error">{error}</p>}{available ? <button className="db-button primary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await libraryFetch("session", { method: "POST" }); router.refresh(); } catch (err) { setError((err as Error).message); setBusy(false); } }}>{busy ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />}Open local dashboard</button> : <Link className="db-button primary" href="/preview">View dashboard preview <ArrowRight size={15} /></Link>}<Link className="db-back-link" href="/">Back to homepage</Link></div></main>;
}

export function DashboardSkeleton() {
  return <div className="db-loading" role="status" aria-label="Loading projects"><div className="db-skeleton heading" /><div className="db-skeleton subheading" /><div className="db-project-grid">{[1,2,3].map(n => <div className="db-skeleton card" key={n} />)}</div><span className="sr-only">Loading your project library…</span></div>;
}

export function Dashboard({ screen, initialProfile, preview = false }: { screen: DashboardScreen; initialProfile: LocalProfile; preview?: boolean }) {
  const base = preview ? "/preview" : "/dashboard";
  const router = useRouter();
  const [profile, setProfile] = useState(initialProfile), [projects, setProjects] = useState<ManagedProject[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [query, setQuery] = useState(""), [sort, setSort] = useState("updated"), [kind, setKind] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid"), [onlyStarred, setOnlyStarred] = useState(false), [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false), [legacy, setLegacy] = useState<Project[]>([]);
  const [action, setAction] = useState<{ kind: "rename" | "delete"; project: ManagedProject } | null>(null);
  const [rename, setRename] = useState(""), [actionError, setActionError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    if (preview) { setLoading(false); return; }
    setLoading(true); setError("");
    try { const data = await libraryFetch("projects", { signal }); setProjects(data.projects); }
    catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) setError((err as Error).message); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [preview]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  useEffect(() => {
    if (preview) return;
    try { const saved = JSON.parse(localStorage.getItem("modhorizon-projects") || "[]"); if (Array.isArray(saved)) setLegacy(saved.filter(p => p && typeof p.name === "string" && typeof p.id === "string" && Array.isArray(p.files))); }
    catch { /* Legacy data is left untouched, including malformed entries. */ }
  }, [preview]);
  useEffect(() => { if (action) { setActionError(""); setRename(action.project.name); dialog.current?.showModal(); if (action.kind === "rename") dialog.current?.querySelector("input")?.focus(); } else dialog.current?.close(); }, [action]);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMobile(false); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  const unmatchedLegacy = legacy.filter(p => !projects.some(item => item.legacyId === p.id || item.snapshot?.id === p.id));
  const visible = projects.filter(p => (!onlyStarred || p.starred) && (kind === "all" || p.kind === kind) && `${p.name} ${p.description}`.toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a,b) => sort === "name" ? a.name.localeCompare(b.name) : sort === "created" ? b.createdAt - a.createdAt : b.updatedAt - a.updatedAt);
  async function logout() { if (preview) return; setBusy(true); setError(""); try { await libraryFetch("session", { method: "DELETE" }); router.refresh(); } catch (err) { setError((err as Error).message); setBusy(false); } }
  async function star(project: ManagedProject) {
    setBusy(true); setError("");
    try { const data = await libraryFetch(`projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ revision: project.revision, starred: !project.starred }) }); setProjects(items => items.map(p => p.id === project.id ? data.project : p)); }
    catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  async function confirmAction(event: FormEvent) {
    event.preventDefault(); if (!action) return; setBusy(true); setActionError("");
    try {
      const data = await libraryFetch(`projects/${action.project.id}`, { method: action.kind === "rename" ? "PATCH" : "DELETE", body: JSON.stringify({ revision: action.project.revision, ...(action.kind === "rename" ? { name: rename } : {}) }) });
      setProjects(items => action.kind === "delete" ? items.filter(p => p.id !== action.project.id) : items.map(p => p.id === action.project.id ? data.project : p));
      setNotice(action.kind === "delete" ? "Project deleted." : "Project renamed."); setAction(null);
    } catch (err) { setActionError((err as Error).message); } finally { setBusy(false); }
  }
  async function importHistory() {
    setBusy(true); setError(""); setNotice("");
    let imported = 0;
    try {
      for (const item of unmatchedLegacy) { await libraryFetch("projects", { method: "POST", body: JSON.stringify({ name: item.name, description: item.prompt, kind: item.artifactType || "plugin", platform: item.target || "paper", version: item.version, importSnapshot: item }) }); imported++; }
      setNotice(`${imported} browser project${imported === 1 ? "" : "s"} imported. Browser history has been kept.`); await load();
    } catch (err) { await load(); setError(`${imported} imported. ${(err as Error).message} Browser history has been kept.`); } finally { setBusy(false); }
  }
  const projectItems = (items: ManagedProject[]) => <div className={`db-project-${view}`}>
    {items.map(project => <article className="db-project" key={project.id}>
      <div className="db-project-icon"><FileCode2 size={20} strokeWidth={1.5} /></div>
      <div className="db-project-main"><Link href={`/dashboard/projects/${project.id}`} className="db-project-name">{project.name}</Link><p>{project.description || `An empty canvas for your next ${projectTypeName(project.kind).toLowerCase()}.`}</p><div className="db-project-meta"><span>{projectTargetName(project)}</span><span>{project.version}</span><span>{project.snapshot ? "Source saved" : "Draft"}</span></div></div>
      <div className="db-project-actions"><button className={`db-icon ${project.starred ? "is-starred" : ""}`} disabled={busy} aria-label={`${project.starred ? "Unstar" : "Star"} ${project.name}`} aria-pressed={project.starred} onClick={() => void star(project)}><Star size={15} fill={project.starred ? "currentColor" : "none"} /></button><details className="db-project-menu"><summary aria-label={`Actions for ${project.name}`}><MoreHorizontal size={18} /></summary><div><button onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); setAction({ kind: "rename", project }); }}>Rename</button><button className="danger-text" onClick={event => { event.currentTarget.closest("details")?.removeAttribute("open"); setAction({ kind: "delete", project }); }}>Delete</button></div></details></div>
      <div className="db-project-footer"><span>{project.legacyId ? "Imported" : "Updated"} {new Date(project.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span><Link href={`/dashboard/projects/${project.id}`} aria-label={`Open ${project.name}`}><ArrowUpRight size={16} /></Link></div>
    </article>)}
  </div>;
  return <div className="db-shell">
    <a href="#dashboard-content" className="db-skip">Skip to content</a>
    {mobile && <button className="db-nav-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`db-sidebar ${mobile ? "open" : ""}`} id="dashboard-navigation"><Link className="db-brand" href="/"><Blocks size={23} />ModHorizon</Link><button className="db-mobile-close db-icon" aria-label="Close menu" onClick={() => setMobile(false)}><X size={18} /></button><span className="db-workspace-label"><span className="db-local-dot" />{preview ? "Public preview" : "Local workspace"}<ChevronDown size={12} /></span><nav aria-label="Dashboard navigation">{links.map(([key,href,Icon]) => <Link key={key} href={preview ? href.replace("/dashboard", "/preview") : href} aria-current={screen === key ? "page" : undefined} className={screen === key ? "active" : ""}><Icon size={16} /><span>{titles[key]}</span>{key === "projects" && !loading && <small>{projects.length}</small>}</Link>)}</nav><div className="db-sidebar-end"><div className="db-local-note"><ShieldCheck size={15} /><div>{preview ? "Read-only interface preview" : "Saved on this computer"}<span>{preview ? "No private projects or account data" : "Local session · online accounts not connected"}</span></div></div><Link href="/workspace" className="db-legacy-link"><Terminal size={15} />Original prototype<ArrowUpRight size={12} /></Link><button className="db-profile" onClick={() => router.push(`${base}/settings`)}><span className="db-avatar">{profile.displayName ? profile.displayName.slice(0,1).toUpperCase() : <Folder size={15} />}</span><span>{profile.displayName || (preview ? "Visitor" : "Local developer")}<small>Workspace settings</small></span><Settings2 size={14} /></button></div></aside>
    <div className="db-main"><header className="db-topbar"><button className="db-mobile-open db-icon" aria-label="Open dashboard navigation" aria-expanded={mobile} aria-controls="dashboard-navigation" onClick={() => setMobile(true)}><Menu size={19} /></button><div className="db-breadcrumb">Workspace <span>/</span> <strong>{titles[screen]}</strong></div>{(screen === "home" || screen === "projects") && <label className="db-search"><Search size={14} /><input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={e => setQuery(e.target.value)} /><kbd>⌕</kbd></label>}<Link href={base + "/credits"} className="db-topbar-credits"><CreditBalance balance={profile.credits} /></Link><details className="db-account-menu"><summary aria-label="Account menu"><span className="db-avatar">{profile.displayName ? profile.displayName.slice(0,1).toUpperCase() : <Folder size={14} />}</span></summary><div><span>{profile.displayName || (preview ? "Public preview" : "Local workspace")}</span><Link href={base + "/settings"}>Settings</Link><button disabled={busy || preview} onClick={() => void logout()}><LogOut size={13} />End local session</button></div></details></header>
      <main className="db-content" id="dashboard-content">
        {preview && <div className="db-notice" role="status"><ShieldCheck size={16} /><span>Read-only public preview. Explore the interface; project storage, accounts and generation are not connected here. No private projects are shown.</span></div>}
        {error && <div role="alert" className="db-alert"><span>{error}</span><button className="db-text-button" onClick={() => void load()}>Retry loading</button></div>}
        {notice && <div role="status" className="db-notice"><Check size={14} />{notice}<button className="db-icon" aria-label="Dismiss notification" onClick={() => setNotice("")}><X size={14} /></button></div>}
        {screen === "home" && <><div className="db-page-heading"><div><span className="db-eyebrow">YOUR CREATIVE WORKSPACE</span><h1>{profile.displayName ? `Welcome back, ${profile.displayName}.` : "Your next idea starts here."}</h1><p>Pick up a project, or make room for something new.</p></div><Link href={base + "/new"} className="db-button primary"><Plus size={16} />Create project</Link></div><section className="db-start-panel"><div><span className="db-eyebrow">MINECRAFT JAVA · PAPER</span><h2>A small idea. A different way to play.</h2><p>Create a project, describe a mechanic, and explore the source in your workspace.</p><Link href={base + "/new"}>Start a new plugin <ArrowRight size={15} /></Link></div><div className="db-start-code" aria-hidden="true"><span><FileCode2 size={13} />YourNextPlugin.java</span><code><i>// A new way to play starts here.</i><br /><b>public class</b> YourNextPlugin<br />&nbsp; <b>extends</b> JavaPlugin {"{"}<br />&nbsp; // What will you build?<br />{"}"}</code></div></section><div className="db-section-heading"><h2>Recent projects</h2><Link href={base + "/projects"}>View all projects <ArrowRight size={13} /></Link></div>{loading ? <DashboardSkeleton /> : error ? null : projects.length ? (visible.length ? projectItems(visible.slice(0,6)) : <div className="db-empty"><Search size={24} /><h2>No matching projects.</h2><p>Try another search.</p><button className="db-button quiet" onClick={() => setQuery("")}>Clear search</button></div>) : <EmptyProjects preview={preview} />}<div className="db-quick-actions"><Link href={base + "/new"}><Plus size={17} /><span>New Paper plugin<small>Choose your version and get started</small></span><ArrowUpRight size={15} /></Link><Link href={base + "/credits"}><Coins size={17} /><span>Credits & rewards<small>See what is connected and what is planned</small></span><ArrowUpRight size={15} /></Link></div></>}
        {screen === "projects" && <><div className="db-page-heading"><div><span className="db-eyebrow">A HOME FOR YOUR IDEAS</span><h1>My projects</h1><p>Organize, refine, and return to your Minecraft projects.</p></div><Link href={base + "/new"} className="db-button primary"><Plus size={16} />Create project</Link></div><div className="db-library-tools"><div><label><span className="sr-only">Project type</span><select value={kind} onChange={e => setKind(e.target.value)}><option value="all">All project types</option>{PROJECT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}s</option>)}</select></label><button className={`db-button quiet ${onlyStarred ? "selected" : ""}`} aria-pressed={onlyStarred} onClick={() => setOnlyStarred(!onlyStarred)}><Star size={13} />Starred</button></div><div><label><span className="sr-only">Sort projects</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="updated">Recently updated</option><option value="created">Recently created</option><option value="name">Name A–Z</option></select></label><div className="db-view-switch"><button className="db-icon" aria-label="Grid view" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid2X2 size={15} /></button><button className="db-icon" aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={16} /></button></div></div></div>{loading ? <DashboardSkeleton /> : error ? null : projects.length === 0 ? <EmptyProjects preview={preview} /> : visible.length ? projectItems(visible) : <div className="db-empty"><Search size={26} /><h2>No matching projects.</h2><p>Try another search, type, or starred filter.</p><button className="db-button quiet" onClick={() => { setQuery(""); setKind("all"); setOnlyStarred(false); }}>Clear filters</button></div>}</>}
        {(screen === "home" || screen === "projects") && !loading && unmatchedLegacy.length > 0 && <div className="db-import"><Folder size={18} /><div><strong>{unmatchedLegacy.length} project{unmatchedLegacy.length === 1 ? "" : "s"} in your browser history</strong><p>Import saved source into the database. Your original browser history will be kept.</p></div><button className="db-button quiet" disabled={busy} onClick={() => void importHistory()}>{busy ? "Importing…" : "Import projects"}</button></div>}
        {screen === "new" && <NewProjectForm preview={preview} />}
        {screen === "credits" && <><div className="db-page-heading"><div><span className="db-eyebrow">ACCOUNT RESOURCES</span><h1>Credits</h1><p>A clear view of what’s available to your workspace.</p></div></div><section className="db-settings-panel"><div className="db-credit-heading"><Coins size={23} /><div><h2>Credit balance</h2><p>No credit ledger is connected to this local workspace.</p></div><CreditBalance balance={profile.credits} /></div><p>AI provider configuration is separate from credits. Generation is available only through connected providers or the local example preview.</p></section><section className="db-settings-panel"><span className="db-eyebrow">PLANNED REWARDS · NOT ACTIVE</span><h2>A head start, and a reason to share.</h2><div className="db-reward-grid"><div><strong>5 signup credits</strong><p>Planned for registered accounts. No reward has been granted.</p></div><div><strong>25 referral credits</strong><p>Planned after a referred creator’s first legitimate project is verified.</p></div></div><div className="db-detail-row"><span>Referral progress</span><span>Not connected</span></div></section></>}
        {screen === "settings" && <><div className="db-page-heading"><div><span className="db-eyebrow">MAKE YOURSELF AT HOME</span><h1>Settings</h1><p>A few essentials for your local workspace.</p></div></div><ProfileSettings preview={preview} profile={profile} onSaved={setProfile} /><section className="db-settings-panel"><h2>Workspace</h2><div className="db-detail-row"><span>Appearance</span><span>Graphite · dark</span></div><div className="db-detail-row"><span>Project storage</span><span>{preview ? "Not connected in public preview" : "SQLite · this computer"}</span></div><div className="db-detail-row"><span>Account mode</span><span>{preview ? "Public interface preview" : "Single-user local session"}</span></div><p>Online authentication, cloud sync, payments, and a credit ledger are not connected. Provider credentials stay on the server.</p><button className="db-button quiet" disabled={busy} onClick={() => void logout()}><LogOut size={14} />End local session</button></section></>}
      </main><footer className="db-footer"><span>ModHorizon / {preview ? "public preview" : "local development"}</span><span>Paper 1.21.x · Java 21</span></footer>
    </div>
    <dialog ref={dialog} className="db-dialog" onCancel={e => { if (busy) e.preventDefault(); else setAction(null); }} onClose={() => { if (!busy) setAction(null); }} aria-labelledby="project-action-title"><form onSubmit={confirmAction}><div className="db-dialog-heading"><h2 id="project-action-title">{action?.kind === "delete" ? "Delete project?" : "Rename project"}</h2><button className="db-icon" type="button" aria-label="Close dialog" disabled={busy} onClick={() => setAction(null)}><X size={17} /></button></div>{action?.kind === "delete" ? <p>Delete <strong>{action.project.name}</strong> and its saved source? This cannot be undone. Separate browser history is kept.</p> : <label>Project name<input autoFocus required maxLength={48} value={rename} onChange={e => setRename(e.target.value)} /></label>}{actionError && <p role="alert" className="db-error">{actionError}</p>}<div className="db-dialog-actions"><button type="button" className="db-button quiet" disabled={busy} onClick={() => setAction(null)}>Cancel</button><button className={`db-button ${action?.kind === "delete" ? "danger" : "primary"}`} disabled={busy || (action?.kind === "rename" && !rename.trim())}>{busy ? "Saving…" : action?.kind === "delete" ? "Delete project" : "Save name"}</button></div></form></dialog>
  </div>;
}

function EmptyProjects({ preview = false }: { preview?: boolean }) { return <div className="db-empty"><FolderOpen size={30} strokeWidth={1.4} /><h2>Your first project belongs here.</h2><p>Create a Paper plugin and give your next idea a place to grow.</p><Link className="db-button quiet" href={preview ? "/preview/new" : "/dashboard/new"}><Plus size={14} />Create your first project</Link></div>; }

function NewProjectForm({ preview = false }: { preview?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(""), [description, setDescription] = useState(""), [version, setVersion] = useState<string>(MINECRAFT_VERSIONS.at(-1)!);
  const [kind, setKind] = useState<ArtifactType>("plugin"), [platform, setPlatform] = useState<ArtifactTarget>("paper");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const targets = PROJECT_TARGETS[kind];
  async function submit(event: FormEvent) {
    event.preventDefault(); if (preview) return; setBusy(true); setError("");
    try { const data = await libraryFetch("projects", { method: "POST", body: JSON.stringify({ name, description, version, kind, platform }) }); router.push(`/dashboard/projects/${data.project.id}`); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return <><Link className="db-back-link" href={preview ? "/preview/projects" : "/dashboard/projects"}><ArrowLeft size={13} />All projects</Link><div className="db-page-heading"><div><span className="db-eyebrow">START SOMETHING NEW</span><h1>Create a project</h1><p>Choose what you want to make and its Minecraft target.</p></div></div><div className="db-create-layout"><form onSubmit={submit} className="db-create-form"><label>Project name <span>Required</span><input autoFocus required maxLength={48} placeholder="e.g. Nightfall Rewards" value={name} onChange={e => setName(e.target.value)} disabled={busy} /></label><div className="db-form-columns"><label>Project type<select value={kind} disabled={busy} onChange={e => { const next = e.target.value as ArtifactType; setKind(next); setPlatform(PROJECT_TARGETS[next][0].id); }}>{PROJECT_TYPES.map(type => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label><label>Target<select value={platform} disabled={busy} onChange={e => setPlatform(e.target.value as ArtifactTarget)}>{targets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}</select></label></div><label>Minecraft version<select value={version} disabled={busy} onChange={e => setVersion(e.target.value)}>{[...MINECRAFT_VERSIONS].reverse().map(v => <option key={v} value={v}>{v}</option>)}</select></label><label>Initial description <span>Optional</span><textarea maxLength={4000} rows={5} placeholder={`What should your ${projectTypeName(kind).toLowerCase()} do? You can refine this in the workspace.`} value={description} onChange={e => setDescription(e.target.value)} disabled={busy} /><small>{description.length.toLocaleString()} / 4,000</small></label>{error && <div role="alert" className="db-error">{error}</div>}<div className="db-form-footer"><p>{preview ? "Interface preview only. Creating projects requires connected account and storage services." : "Creates a saved project. AI generation starts only when you request it in the workspace."}</p><button className="db-button primary" disabled={busy || preview || !name.trim()}>{busy ? <LoaderCircle size={15} className="spin" /> : <Plus size={15} />}{busy ? "Creating…" : "Create project"}</button></div></form><aside className="db-create-help"><span className="db-eyebrow">A GOOD PLACE TO BEGIN</span><h2>One idea at a time.</h2><p>Choose the artifact type and platform that match your Minecraft setup.</p><div><Check size={14} />Specialized generation guidance</div><div><Check size={14} />Minecraft {version} target</div><div><Check size={14} />Review source before installing</div><p className="db-help-note">Resource and shader packs download as ZIPs. Mods need a configured loader-capable build service for a JAR. Text-only resource packs cannot include generated textures yet.</p></aside></div></>;
}

function ProfileSettings({ profile, onSaved, preview = false }: { profile: LocalProfile; onSaved: (profile: LocalProfile) => void; preview?: boolean }) {
  const [name, setName] = useState(profile.displayName), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  return <form className="db-settings-panel" onSubmit={async e => { e.preventDefault(); if (preview) return; setBusy(true); setMessage(""); try { const data = await libraryFetch("session", { method: "PATCH", body: JSON.stringify({ displayName: name }) }); onSaved(data.profile); setMessage("Display name saved."); } catch (err) { setMessage((err as Error).message); } finally { setBusy(false); } }}><h2>Your profile</h2><label>Display name<input disabled={preview} maxLength={60} placeholder="How should we greet you?" value={name} onChange={e => setName(e.target.value)} /></label><p>Saved on this computer and used in your welcome message.</p><div className="db-settings-save"><button className="db-button primary" disabled={busy || preview}>{busy ? "Saving…" : "Save changes"}</button><span role="status">{message}</span></div></form>;
}
