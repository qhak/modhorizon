"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ManagedProject, LocalProfile } from "@/lib/managed-project";
import { CreditBalance } from "./credit-balance";
import { TexturePreviews } from "./texture-previews";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  Blocks,
  Check,
  ChevronDown,
  CircleHelp,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  History,
  LoaderCircle,
  Menu,
  PanelLeftClose,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SquareTerminal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MINECRAFT_VERSIONS, type ArtifactTarget, type ArtifactType, type Project } from "@/lib/types";
import { MODEL_OPTIONS, type ModelOption, type ModelProvider } from "@/lib/models";


type SourceFile = { path: string; content: string };
type ArtifactOption = { type: ArtifactType; label: string; targets: { id: ArtifactTarget; label: string }[]; output: string; limitations: string[] };
type Message = { role: "user" | "assistant"; text: string };
const milestone =
  "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.";
const suggestions = [
  { title: "Zombie rewards", description: "Reward zombie kills with a speed boost", prompt: milestone },
  { title: "Spawn command", description: "A /spawn command with a welcome message", prompt: "Create a Paper plugin with a /spawn command that teleports players to the world spawn and sends a configurable welcome message." },
  { title: "Server menu", description: "A custom server menu with /menu", prompt: "Create a Paper plugin with a /menu command that opens a simple inventory GUI containing a compass that teleports the player to spawn." },
];
const DEFAULT_ARTIFACT_OPTIONS: ArtifactOption[] = [
  { type: "plugin", label: "Server plugin", targets: [{ id: "paper", label: "Paper" }], output: "paper-jar-requires-build-service", limitations: [] },
  { type: "mod", label: "Minecraft mod", targets: [{ id: "fabric", label: "Fabric" }, { id: "forge", label: "Minecraft Forge" }, { id: "neoforge", label: "NeoForge" }], output: "mod-jar-requires-mod-loader-build-service", limitations: [] },
  { type: "resource_pack", label: "Resource pack", targets: [{ id: "vanilla", label: "Vanilla resource pack" }], output: "installable-zip", limitations: [] },
  { type: "shader_pack", label: "Shader pack", targets: [{ id: "iris", label: "Iris" }, { id: "optifine", label: "OptiFine" }], output: "installable-zip", limitations: [] },
  { type: "datapack", label: "Datapack", targets: [{ id: "vanilla", label: "Vanilla datapack" }], output: "installable-zip", limitations: ["Minecraft Java 1.13 or newer; test commands in game."] },
];
const EXAMPLE_PROMPTS: Record<ArtifactType, string> = {
  datapack: "Create a Minecraft Java datapack with a manual function that gives a player a small starter kit once, tracked by a scoreboard.",
  plugin: "Create a Paper plugin with a /spawn command that teleports players to world spawn.",
  mod: "Create a Fabric mod that adds a craftable copper lantern with a soft blue glow.",
  resource_pack: "Make my diamond sword, pickaxe, axe, shovel and hoe dark cherry red, keeping the classic Minecraft pixel style.",
  shader_pack: "Create a lightweight Iris shader pack with warm sunset colors, subtle water reflections, and a performance-friendly settings file.",
};
const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  datapack: "datapack",
  plugin: "server plugin", mod: "Minecraft mod", resource_pack: "resource pack", shader_pack: "shader pack",
};

function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? "brand-small" : ""}`}>
      <span className="brand-icon">
        <Blocks size={21} strokeWidth={1.8} />
      </span>
      <span>
        ModHorizon<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function fileLabel(path: string) {
  return path.split("/").at(-1) || path;
}
function downloadSource(project: Project) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            name: project.name,
            version: project.version,
            files: project.files,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name}-source.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function Highlight({ code, path }: { code: string; path: string }) {
  return (
    <div className="source-lines">
      {code.split("\n").map((line, i) => (
        <div className="source-line" key={i}>
          <span className="line-number">{i + 1}</span>
          <code>
            {line
              .split(
                /("[^"\n]*"|'[^'\n]*'|\/\/.*$|\b(?:package|import|public|private|class|extends|implements|void|new|if|return|final|int|boolean|true|false|null)\b|@\w+)/g,
              )
              .map((part, j) => (
                <span
                  key={j}
                  className={
                    part.startsWith("//")
                      ? "syntax-comment"
                      : /^["']/.test(part)
                        ? "syntax-string"
                        : /^(package|import|public|private|class|extends|implements|void|new|if|return|final|int|boolean|true|false|null|@\w+)$/.test(
                              part,
                            )
                          ? "syntax-keyword"
                          : undefined
                  }
                >
                  {part || ""}
                </span>
              )) || " "}
          </code>
        </div>
      ))}
      <span className="sr-only">Read-only {path}</span>
    </div>
  );
}

function VersionPicker({ value, onChange, disabled }: {
  value: string; onChange: (version: string) => void; disabled: boolean;
}) {
  return <label className="version-picker">
    <span className="sr-only">Minecraft version</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {[...MINECRAFT_VERSIONS].reverse().map((version) => <option key={version} value={version}>{version}</option>)}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}

function ArtifactPicker({ value, options, onChange, disabled }: {
  value: ArtifactType; options: ArtifactOption[]; onChange: (type: ArtifactType) => void; disabled: boolean;
}) {
  return <label className="version-picker">
    <span className="sr-only">Minecraft project type</span>
    <select value={value} onChange={(event) => onChange(event.target.value as ArtifactType)} disabled={disabled}>
      {options.map((option) => <option key={option.type} value={option.type}>{option.label}</option>)}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}

function TargetPicker({ value, targets, onChange, disabled }: {
  value: ArtifactTarget; targets: ArtifactOption["targets"]; onChange: (target: ArtifactTarget) => void; disabled: boolean;
}) {
  if (targets.length < 2) return <span className="platform-pill">{targets[0]?.label || value}</span>;
  return <label className="version-picker">
    <span className="sr-only">Build target</span>
    <select value={value} onChange={(event) => onChange(event.target.value as ArtifactTarget)} disabled={disabled}>
      {targets.map((target) => <option key={target.id} value={target.id}>{target.label}</option>)}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}

function ModelPicker({
  value,
  onChange,
  onSetup,
  choices,
  disabled,
}: {
  value: string;
  onChange: (modelId: string) => void;
  onSetup: () => void;
  choices: Record<string, boolean>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = MODEL_OPTIONS.find((model) => model.id === value) || MODEL_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLButtonElement>(".model-trigger")?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) root.current?.querySelector<HTMLButtonElement>('.model-option[aria-pressed="true"]:not(:disabled), .model-option:not(:disabled)')?.focus();
  }, [open]);

  const rate = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  const showRate = (input?: number, output?: number) =>
    input === undefined || output === undefined
      ? "No provider call"
      : `${rate(input)} in · ${rate(output)} out / 1M`;
  const groupOrder = ["Economy", "Balanced", "Advanced", "Frontier"];
  const models = MODEL_OPTIONS.filter(
    (model): model is ModelOption & { provider: Exclude<ModelProvider, "demo"> } =>
      model.provider !== "demo",
  ).sort((left, right) => groupOrder.indexOf(left.group) - groupOrder.indexOf(right.group));
  const provider = selected.provider === "demo" ? null : selected.provider;

  return (
    <div className="model-picker" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }} onKeyDown={(event) => {
      if (!open || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const options = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".model-options button:not(:disabled)") || []);
      const index = options.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
      options[next]?.focus();
    }} >
      <button
        type="button"
        className="model-trigger"
        aria-label={`AI model: ${selected.label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="ai-model-menu"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        {provider ? <ProviderLogo provider={provider} /> : <Cpu size={14} aria-hidden="true" />}
        <span>{selected.label}</span>
        {!choices[value] && <span className="model-unavailable">Not configured</span>}
        <ChevronDown size={13} aria-hidden="true" />
      </button>
      {open && (
        <div id="ai-model-menu" className="model-options" role="dialog" aria-label="Choose an AI model">
          <div className="model-options-heading">
            <strong>Choose a model</strong>
            <span>Provider rates · USD per 1M tokens</span>
          </div>
          <div>
          {models.map((model, index) => (
            <div key={model.id}>
              {(index === 0 || models[index - 1].group !== model.group) && (
                <span className="model-group-label">{model.group}</span>
              )}
              <button
                type="button"
                aria-pressed={value === model.id}
                title={choices[model.id] ? undefined : `Connect ${model.providerLabel} in server configuration to enable this choice.`}
                disabled={!choices[model.id]}
                className={`model-option ${value === model.id ? "model-option-active" : ""}`}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                  root.current?.querySelector<HTMLButtonElement>(".model-trigger")?.focus();
                }}
              >
                <ProviderLogo provider={model.provider} />
                <span className="model-option-main">
                  <strong>{model.label}</strong>
                  <small>{model.description}</small>
                </span>
                <span className="model-option-price">
                  {showRate(model.inputUsdPerMillion, model.outputUsdPerMillion)}
                </span>
                {choices[model.id] ? (
                  value === model.id && <Check size={14} aria-hidden="true" />
                ) : (
                  <span className="model-connect-label">Setup</span>
                )}
              </button>
            </div>
          ))}
          {choices.demo && (
            <div className="model-demo-wrap">
              <span className="model-group-label">LOCAL PREVIEW</span>
              <button
                type="button"
                aria-pressed={value === "demo"}
                className={`model-option ${value === "demo" ? "model-option-active" : ""}`}
                onClick={() => {
                  onChange("demo");
                  setOpen(false);
                  root.current?.querySelector<HTMLButtonElement>(".model-trigger")?.focus();
                }}
              >
                <span className="provider-logo provider-logo-demo" aria-hidden="true"><Cpu size={13} /></span>
                <span className="model-option-main">
                  <strong>Local example preview</strong>
                  <small>Fixed example; no AI call</small>
                </span>
                <span className="model-option-price">Free</span>
                {value === "demo" && <Check size={14} aria-hidden="true" />}
              </button>
            </div>
          )}
          </div>
          <p className="model-pricing-note">Provider rates are shown for reference. ModHorizon credit pricing is not active yet.</p>
          <button type="button" className="model-setup-link" onClick={onSetup}>Provider setup</button>
        </div>
      )}
    </div>
  );
}

function ProviderLogo({ provider }: { provider: Exclude<ModelProvider, "demo"> }) {
  return provider === "openai" ? (
    <span className="provider-logo provider-logo-openai" aria-label="OpenAI" title="OpenAI">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" /></svg>
    </span>
  ) : provider === "anthropic" ? (
    <span className="provider-logo provider-logo-claude" role="img" aria-label="Claude" title="Claude">
      <img src="/providers/claude_app_icon.png" alt="" />
    </span>
  ) : (
    <span className="provider-logo provider-logo-gemini" aria-label="Google Gemini" title="Google Gemini">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" /></svg>
    </span>
  );
}

export default function Workspace({ managedId, profile }: { managedId?: string; profile?: LocalProfile }) {
  const [managed, setManaged] = useState<ManagedProject | null>(null);
  const [managedProjects, setManagedProjects] = useState<ManagedProject[]>([]);
  const [managedLoading, setManagedLoading] = useState(Boolean(managedId));
  const [managedError, setManagedError] = useState("");
  const [managedSaving, setManagedSaving] = useState(false);
  const [pendingSnapshot, setPendingSnapshot] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState("");
  const [version, setVersion] = useState("1.21.11");
  const [artifactOptions, setArtifactOptions] = useState(DEFAULT_ARTIFACT_OPTIONS);
  const [artifactType, setArtifactType] = useState<ArtifactType>("plugin");
  const [target, setTarget] = useState<ArtifactTarget>("paper");
  const [selectedModel, setSelectedModel] = useState("demo");
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState("");
  const [tab, setTab] = useState<"conversation" | "code" | "logs" | "test">("conversation");
  const [testTarget, setTestTarget] = useState<"local" | "hosted">("local");
  const [modal, setModal] = useState<"settings" | "guide" | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [phase, setPhase] = useState(0);
  const [services, setServices] = useState<{
    generationAvailable: boolean;
    buildConfigured: boolean;
    message: string;
    choices: Record<string, boolean>;
    preferred: string;
  } | null>(null);
  const generationUnavailable = !services?.choices[selectedModel];
  const artifactOption = artifactOptions.find((option) => option.type === artifactType) || DEFAULT_ARTIFACT_OPTIONS[0];
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const managedBlocked = Boolean(managedId && (!managed || managedLoading || managedSaving));

  useEffect(() => {
    if (!pendingSnapshot) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [pendingSnapshot]);

  useEffect(() => {
    if (!managedId) return;
    const controller = new AbortController();
    fetch("/api/library/projects", { cache: "no-store", signal: controller.signal })
      .then(async response => { if (!response.ok) return; const data = await response.json(); setManagedProjects(data.projects); })
      .catch(() => { /* The current project request reports access/storage errors. */ });
    fetch(`/api/library/projects/${managedId}`, { cache: "no-store", signal: controller.signal })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data.project as ManagedProject; })
      .then(saved => {
        setManaged(saved); setVersion(saved.version); setArtifactType(saved.kind); setTarget(saved.platform);
        if (saved.snapshot) openProject(saved.snapshot);
        else setPrompt(saved.description);
        setManagedError("");
      })
      .catch(err => { if (err.name !== "AbortError") setManagedError(err.message || "Project could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setManagedLoading(false); });
    return () => controller.abort();
    // A managed project is loaded once per route; opening browser history is separate.
  }, [managedId]);

  async function persistSnapshot(snapshot: Project) {
    if (!managedId || !managed) return;
    setManagedSaving(true); setManagedError(""); setPendingSnapshot(snapshot);
    try {
      const response = await fetch(`/api/library/projects/${managedId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: managed.revision, snapshot }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Source could not be saved.");
      setManaged(data.project); setPendingSnapshot(null);
    } catch (err) { setManagedError(`${(err as Error).message} Your source remains open and in browser history. Export it before leaving.`); }
    finally { setManagedSaving(false); }
  }

  useEffect(() => {
    // Retire saved accent palettes so returning workspaces use the graphite identity.
    document.documentElement.dataset.theme = "graphite";
    try {
      localStorage.setItem("modhorizon-theme", "graphite");
    } catch {
      // The shared graphite palette also works without browser storage.
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/status", { signal: controller.signal, cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setServices(data);
        setSelectedModel((current) => data.choices[current] ? current : data.preferred);
      })
      .catch(() => { /* Submission still reports service errors if status cannot load. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/generate", { signal: controller.signal, cache: "force-cache" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (Array.isArray(data.artifacts) && data.artifacts.length) setArtifactOptions(data.artifacts); })
      .catch(() => { /* Local defaults keep the mode picker usable if the catalog is offline. */ });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("modhorizon-projects") || "[]",
      );
      if (Array.isArray(saved))
        setProjects(
          saved
            .filter(
              (p: Project) =>
                p &&
                typeof p.id === "string" &&
                typeof p.name === "string" &&
                typeof p.prompt === "string" &&
                Array.isArray(p.files) &&
                p.files.every(
                  (f: SourceFile) =>
                    typeof f.path === "string" && typeof f.content === "string",
                ) &&
                Array.isArray(p.logs) &&
                p.logs.every((l: string) => typeof l === "string"),
            )
            .slice(0, 12)
            .map((p: Project) => ({ ...p, artifactAvailable: false })),
        );
    } catch {
      setStorageError(true);
    }
    setHistoryLoaded(true);
  }, []);
  useEffect(() => {
    if (!historyLoaded) return;
    try {
      localStorage.setItem(
        "modhorizon-projects",
        JSON.stringify(projects.slice(0, 12)),
      );
    } catch {
      setStorageError(true);
    }
  }, [projects, historyLoaded]);
  useEffect(() => {
    if (modal) dialog.current?.showModal();
    else dialog.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!busy) {
      setPhase(0);
      return;
    }
    const timer = setInterval(() => setPhase((p) => Math.min(p + 1, 2)), 3500);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNav(false);
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setShowSearch((s) => !s);
      }
      const editing =
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea, select") ||
          event.target.isContentEditable);
      if (
        !busy &&
        !modal &&
        !editing &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === "n"
      ) {
        if (managedId) { window.location.href = "/dashboard/new"; return; }
        setProject(null);
        setPrompt("");
        setMessages([]);
        setError("");
        setMobileNav(false);
        setTimeout(() => input.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [busy, modal, managedId]);

  function newProject() {
    if (managedId) { window.location.href = "/dashboard/new"; return; }
    setProject(null);
    if (!managedId) { setArtifactType("plugin"); setTarget("paper"); }
    setPrompt("");
    setMessages([]);
    setError("");
    setMobileNav(false);
    setTimeout(() => input.current?.focus(), 0);
  }
  function openProject(p: Project) {
    setProject(p);
    setArtifactType(p.artifactType || "plugin");
    setTarget(p.target || "paper");
    setVersion(p.version);
    if (p.modelId && MODEL_OPTIONS.some((model) => model.id === p.modelId))
      setSelectedModel(p.modelId);
    setMessages([
      { role: "user", text: p.prompt },
      {
        role: "assistant",
        text:
          p.error ||
          (p.status === "success"
            ? p.artifactType === "resource_pack" || p.artifactType === "shader_pack" || p.artifactType === "datapack"
              ? "Your pack ZIP is ready to download. Install it in Minecraft and verify the result in game."
              : p.artifactType === "mod"
                ? `The ${p.target} build service returned a mod JAR. Test it on a matching client and server.`
                : "The build service compiled this plugin. Download it and verify its behavior on a local Paper server."
            : p.artifactType === "resource_pack" || p.artifactType === "shader_pack" || p.artifactType === "datapack"
              ? "Source preview ready. The validated pack files will be packaged as a ZIP."
              : p.artifactType === "mod"
                ? "Source preview ready. Connect a loader-capable isolated build service to compile a mod JAR."
                : "Source preview ready. This has not been compiled. Connect an isolated build service to build a JAR."),
      },
    ]);
    setSelectedFile(p.files[0]?.path || "");
    setPrompt("");
    setError("");
    setTab("conversation");
    setMobileNav(false);
  }
  async function generate() {
    if (busy || managedSaving || managedLoading || (managedId && !managed) || generationUnavailable || prompt.trim().length < 12) return;
    const text = prompt.trim();
    const current = project;
    if (current) setTab("conversation");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          version: current?.version || version,
          artifactType: current?.artifactType || artifactType,
          target: current?.target || target,
          modelId: selectedModel,
          ...(current
            ? { project: { name: current.name, files: current.files } }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.project)
        throw new Error(data.error || "Generation failed. Please try again.");
      const next: Project = data.project;
      if (current && next.status === "failed") {
        const failure =
          next.error ||
          "The edit failed. Your previous source is still available.";
        setMessages((previous) => [
          ...previous,
          { role: "user", text },
          {
            role: "assistant",
            text: `${failure} Your previous source has been kept.`,
          },
        ]);
        setError(failure);
        setPrompt("");
        return;
      }
      setProject(next);
      setSelectedFile(next.files[0]?.path || "");
      setTab("conversation");
      setProjects((previous) =>
        [
          next,
          ...previous.filter((p) => p.id !== current?.id && p.id !== next.id),
        ].slice(0, 12),
      );
      setMessages((previous) => [
        ...(current ? previous : []),
        { role: "user", text },
        {
          role: "assistant",
          text:
            next.error ||
            (next.status === "success"
              ? "Your plugin compiled successfully. Review the source and test it on a local Paper server before use."
              : next.provider === "mock"
                ? "Your source preview is ready. The development provider generated a zombie speed-boost example. No compilation has run and no JAR is available."
                : "Your AI-generated source is ready. No build service is configured, so compilation has not run and no JAR is available."),
        },
      ]);
      setPrompt("");
      if (managedId && next.files.length > 0) await persistSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  const currentFile = project?.files.find((f) => f.path === selectedFile);
  const statusLabel =
    project?.status === "success"
      ? project.artifactType === "resource_pack" || project.artifactType === "shader_pack" || project.artifactType === "datapack" ? "Packaged and ready" : "Build passed"
      : project?.status === "failed"
        ? "Build failed"
        : "Source preview";
  const artifactExtension = project?.artifactType === "plugin" || project?.artifactType === "mod" ? "jar" : "zip";

  return (
    <div className="app-shell">
      {managedId && <div className="managed-project-bar" role="status"><Link href="/dashboard/projects">← My projects</Link><strong>{managed?.name || "Loading project…"}</strong><span>{managedLoading ? "Loading saved source…" : managedSaving ? "Saving source…" : managedError ? "Save requires attention" : "Saved project"}</span></div>}
      {managedId && managedError && <div className="managed-project-error" role="alert">{managedError}{pendingSnapshot && <button disabled={managedSaving} onClick={() => void persistSnapshot(pendingSnapshot)}>Retry save</button>}</div>}
      <div className={managedId ? "managed-workspace" : undefined}>
      {mobileNav && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside id="workspace-sidebar" className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-button close-sidebar"
            aria-label="Close sidebar"
            onClick={() => setMobileNav(false)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <Button
          className="new-project"
          variant="secondary"
          onClick={newProject}
          disabled={busy}
        >
          <Plus size={17} />
          New project<span className="key-hint">N</span>
        </Button>
        {managedId && <Link className="nav-item" href="/dashboard"><Blocks size={16} /><span>Dashboard</span></Link>}
        {!managedId && <Link className="nav-item" href="/dashboard"><Blocks size={16} /><span>Project dashboard</span></Link>}
        <button className="nav-item" aria-expanded={showSearch} onClick={() => setShowSearch(!showSearch)}>
          <Folder size={16} /><span>Projects</span><span className="nav-count">{managedId ? managedProjects.length : projects.length}</span>
        </button>
        {showSearch && (
          <input
            className="project-search"
            autoFocus
            placeholder="Find a project…"
            aria-label="Find a project"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div className="project-list">
          {managedId ? managedProjects.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <Link key={p.id} className={`project-item ${p.id === managedId ? "project-active" : ""}`} href={`/dashboard/projects/${p.id}`}><Folder size={15} /><span>{p.name}</span></Link>) : projects
            .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <button
                disabled={busy}
                key={p.id}
                className={`project-item ${project?.id === p.id ? "project-active" : ""}`}
                onClick={() => { if (managedId) window.location.href = "/workspace"; else openProject(p); }}
              >
                <Folder size={15} />
                <span>{p.name}</span>
                <span className={`project-dot ${p.status}`} />
              </button>
            ))}
          {(managedId ? managedProjects.length === 0 : projects.length === 0) && (
            <div className="empty-projects">
              <FolderOpen size={24} strokeWidth={1.3} />
              <p>A home for your ideas.</p>
              <span>Your projects will appear here.</span>
            </div>
          )}
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setModal("settings")}>
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
          <button className="account" onClick={() => { if (managedId) window.location.href = "/dashboard/settings"; else setModal("settings"); }} aria-label="Account and credits">
            <div className="avatar">{profile?.displayName ? profile.displayName.slice(0,1).toUpperCase() : "D"}</div>
            <div><strong>{managedId ? profile?.displayName || "Local developer" : "Guest developer"}</strong><span>{managedId ? "Local session · credits unavailable" : "Local account · credits inactive"}</span></div>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileNav}
              aria-controls="workspace-sidebar"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={19} />
            </button>
            <span className="workspace-label">Workspace</span>
            <span className="crumb-slash">/</span>
            <span>{managed?.name || project?.name || "New project"}</span>
            {project && <span className="tag paper-tag">{artifactOption.targets.find((item) => item.id === project.target)?.label || project.target}</span>}
          </div>
          <div className="topbar-right">
            {managedId && <Link href="/dashboard/credits"><CreditBalance balance={profile?.credits ?? null} /></Link>}
            <button
              className="icon-button"
              aria-label="Open help"
              onClick={() => setModal("guide")}
            >
              <CircleHelp size={17} />
            </button>

          </div>
        </header>

        {!project ? (
          <div className="welcome-scroll">
            <div className="welcome">
              <div className="workspace-home-heading">
                <div>
                  <h1>{managed ? managed.name : "What will you create?"}</h1>
                  <p>Describe your idea. Make it a {ARTIFACT_LABELS[artifactType]}.</p>
                </div>
              </div>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate();
                }}
              >
                <textarea
                  ref={input}
                  aria-label={`Describe your Minecraft ${ARTIFACT_LABELS[artifactType]}`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={4000}
                  placeholder={artifactType === "plugin" ? "A plugin that gives players a speed boost when they defeat a zombie…" : EXAMPLE_PROMPTS[artifactType]}
                  disabled={busy}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault();
                      void generate();
                    }
                  }}
                />
                <div className="composer-footer">
                  <div className="selectors">
                    <ArtifactPicker value={artifactType} options={artifactOptions} onChange={(type) => {
                      setArtifactType(type);
                      setTarget(artifactOptions.find((option) => option.type === type)?.targets[0]?.id || "paper");
                    }} disabled={busy || Boolean(managedId)} />
                    <span className="select-separator" />
                    <TargetPicker value={target} targets={artifactOption.targets} onChange={setTarget} disabled={busy || Boolean(managedId)} />
                    <span className="select-separator" />
                    <ModelPicker
                      value={selectedModel}
                      onChange={setSelectedModel}
                      onSetup={() => setModal("settings")}
                      choices={services?.choices || {}}
                      disabled={busy || managedBlocked}
                    />
                    <span className="select-separator" />
                    <VersionPicker
                      value={version}
                      onChange={setVersion}
                      disabled={busy || Boolean(managedId)}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy || managedBlocked || generationUnavailable || prompt.trim().length < 12}
                    title={generationUnavailable ? "Connect an AI provider in the server configuration to enable generation." : undefined}
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : null}
                    <span>{busy ? "Generating…" : "Generate"}</span>
                    {!busy && <ArrowUp size={15} />}
                  </Button>
                </div>
              </form>
              <div className="composer-meta">
                <span className="composer-meta-right">
                  <span className="provider-note">{services?.message || "Checking provider…"}{artifactOption.limitations.length ? ` · ${artifactOption.limitations[0]}` : ""}</span>
                  <span className="keyboard-hint"><span>Ctrl / ⌘ + Enter</span></span>
                </span>
              </div>
              {busy && (
                <div className="generation-progress" role="status">
                  <LoaderCircle size={14} className="spin" />
                  {
                    [
                      "Validating your request…",
                      "Waiting for generation service…",
                      "Generation is still in progress…",
                    ][phase]
                  }
                  <span>Keep this tab open</span>
                </div>
              )}
              {error && (
                <div className="error-message" role="alert">
                  {error}
                </div>
              )}
              <section id="starter-prompts" className="starter-section">
                <div className="starter-section-heading">
                  <h2>{artifactType === "plugin" ? "A few ideas to start with" : `Try a ${ARTIFACT_LABELS[artifactType]} prompt`}</h2>
                </div>
                <div className="starter-list">
                {(artifactType === "plugin" ? suggestions : [{ title: artifactOption.label, description: `Start with a simple ${ARTIFACT_LABELS[artifactType]}`, prompt: EXAMPLE_PROMPTS[artifactType] }]).map((s) => (
                  <button
                    key={s.title}
                    className="starter-prompt"
                    disabled={busy}
                    onClick={() => {
                      setPrompt(s.prompt);
                      input.current?.focus();
                    }}
                  >
                    <span className="starter-copy"><strong>{s.description}</strong></span>
                    <ArrowRight size={15} className="starter-arrow" />
                  </button>
                ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className={`project-workspace view-${tab}`}>
              <div className="code-toolbar">
                <div className="workspace-tabs" role="tablist" aria-label="Project views" onKeyDown={(event) => {
                  const views = ["conversation", "code", "logs", "test"] as const;
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const index = event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : (views.indexOf(tab) + (event.key === "ArrowRight" ? 1 : views.length - 1)) % views.length;
                  setTab(views[index]);
                  document.getElementById(`tab-${views[index]}`)?.focus();
                }}>
                  <button role="tab" id="tab-conversation" aria-controls="panel-conversation" aria-selected={tab === "conversation"} tabIndex={tab === "conversation" ? 0 : -1} className={tab === "conversation" ? "tab-active" : ""} onClick={() => setTab("conversation")}>Conversation</button>
                  <button
                    role="tab" id="tab-code" aria-controls="panel-code" aria-selected={tab === "code"} tabIndex={tab === "code" ? 0 : -1} className={tab === "code" ? "tab-active" : ""}
                    onClick={() => setTab("code")}
                  >
                    <Code2 size={15} />
                    Files
                  </button>
                  <button
                    role="tab" id="tab-logs" aria-controls="panel-logs" aria-selected={tab === "logs"} tabIndex={tab === "logs" ? 0 : -1} className={tab === "logs" ? "tab-active" : ""}
                    onClick={() => setTab("logs")}
                  >
                    <SquareTerminal size={15} />
                    Build
                  </button>
                <button
                  role="tab" id="tab-test" aria-controls="panel-test" aria-selected={tab === "test"} tabIndex={tab === "test" ? 0 : -1} className={tab === "test" ? "tab-active" : ""}
                  onClick={() => setTab("test")}
                >
                  Test
                </button>
                </div>
                <div className="code-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadSource(project)}
                    disabled={!project.files.length}
                  >
                    <ArrowDownToLine size={14} />
                    <span>Source</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!project.artifactAvailable}
                    title={
                      !project.artifactAvailable
                        ? project.artifactType === "mod" ? "Connect a loader-capable isolated build service to compile this mod." : "No installable artifact is available yet."
                        : `Download ${ARTIFACT_LABELS[project.artifactType ?? "plugin"]} .${artifactExtension}`
                    }
                    onClick={() => {
                      window.location.href = `/api/projects/${project.id}/download`;
                    }}
                  >
                    <ArrowDownToLine size={14} />
                    <span>Download .{artifactExtension}</span>
                  </Button>
                </div>
              </div>
            <section className="chat-panel" id="panel-conversation" role="tabpanel" aria-labelledby="tab-conversation" hidden={tab !== "conversation"}>
              <div className="panel-heading">
                <span>
                  <Sparkles size={15} /> Build with ModHorizon
                </span>
                <span className="tag">{project.version}</span>
              </div>
              <div className="chat-messages">
                {messages.map((message, i) => (
                  <div key={i} className={`message message-${message.role}`}>
                    <div className="message-avatar">
                      {message.role === "assistant" ? (
                        <Blocks size={14} />
                      ) : (
                        "D"
                      )}
                    </div>
                    <div>
                      <strong>
                        {message.role === "assistant" ? "ModHorizon" : "You"}
                      </strong>
                      <p>{message.text}</p>
                      {message.role === "assistant" &&
                        i === messages.length - 1 && (
                          <div className={`result-summary ${project.status}`}>
                            <span>
                              {project.status === "success" ? (
                                <Check size={15} />
                              ) : project.status === "failed" ? (
                                <X size={15} />
                              ) : (
                                <FileCode2 size={15} />
                              )}{" "}
                              {statusLabel}
                            </span>
                            <small>
                              {project.files.length} files · {MODEL_OPTIONS.find((model) => model.id === project.modelId)?.label || project.provider}
                            </small>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="chat-wait" role="status">
                    <LoaderCircle size={15} className="spin" />
                    {
                      [
                        "Validating follow-up…",
                        "Waiting for generation service…",
                        "Still generating…",
                      ][phase]
                    }
                  </div>
                )}
              </div>
              <form
                className="followup-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate();
                }}
              >
                {error && (
                  <div className="error-message" role="alert">
                    {error}
                  </div>
                )}
                <label htmlFor="followup">Keep building</label>
                <textarea
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); void generate(); }
                  }}
                  id="followup"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={busy}
                  maxLength={4000}
                  placeholder={`Describe a change to your ${ARTIFACT_LABELS[project.artifactType ?? "plugin"]}…`}
                />
                <div>
                  <ModelPicker
                    value={selectedModel}
                    onChange={setSelectedModel}
                    onSetup={() => setModal("settings")}
                    choices={services?.choices || {}}
                    disabled={busy}
                  />
                  <Button
                    size="icon"
                    aria-label="Send follow-up"
                    disabled={busy || managedBlocked || generationUnavailable || prompt.trim().length < 12}
                  >
                    {busy ? (
                      <LoaderCircle size={15} className="spin" />
                    ) : (
                      <ArrowUp size={17} />
                    )}
                  </Button>
                </div>
              </form>
            </section>
            <section className="code-panel" id={`panel-${tab === "test" ? "test" : tab === "logs" ? "logs" : "code"}`} role="tabpanel" aria-labelledby={`tab-${tab === "test" ? "test" : tab === "logs" ? "logs" : "code"}`} hidden={tab === "conversation"}>
              <div className={`build-banner ${project.status}`}>
                <span className="live-dot" />
                <strong>{statusLabel}</strong>
                <span>
                  {project.status === "success"
                    ? project.artifactType === "datapack"
                      ? "Packaged as a datapack ZIP. Test commands and gameplay in Minecraft."
                      : project.artifactType === "resource_pack"
                      ? "Resource-pack ZIP ready. Supported diamond-tool recolors include real PNGs; review previews and any reported omissions."
                      : project.artifactType === "shader_pack"
                        ? "Packaged as a shader ZIP. GLSL and GPU behavior still need in-game testing."
                        : project.artifactType === "mod"
                          ? "Compiled by the selected loader build service. Test on a matching client and server."
                          : "Compiled by build service. Verify in-game behavior."
                    : project.status === "failed"
                      ? "Check the logs for details."
                      : project.artifactType === "mod"
                        ? `Not compiled. Connect a build service that supports ${project.target}.`
                        : "Not compiled. Connect an isolated build service to create a JAR."}
                </span>
                <button
                  className="icon-button"
                  aria-label="View build setup"
                  onClick={() => setModal("settings")}
                >
                  <SlidersHorizontal size={14} />
                </button>
              </div>
              {project.artifactType === "resource_pack" && project.artifactAvailable && <TexturePreviews files={project.files} />}
              {tab === "test" ? (
                <div className="test-workflow">
                  <div className="test-workflow-heading">
                    <div>
                      <span className="eyebrow">FROM PROMPT TO PLAYTEST</span>
                      <h2>Test your {ARTIFACT_LABELS[project.artifactType ?? "plugin"]}</h2>
                      <p>Review the output, install it in a matching Minecraft setup, and verify the behavior in game.</p>
                    </div>
                    {project.artifactAvailable && (
                      <Button size="sm" onClick={() => { window.location.href = `/api/projects/${project.id}/download`; }}>
                        <ArrowDownToLine size={14} /> Download .{artifactExtension}
                      </Button>
                    )}
                  </div>
                  <ol className="test-steps" aria-label="Plugin testing progress">
                    <li className={project.files.length ? "test-step-done" : "test-step-current"}><span>1</span><div><strong>Describe and generate</strong><small>{project.files.length ? "Source files are ready for review." : "Generation did not return source files. Review the conversation and try again."}</small></div>{project.files.length ? <Check size={15} /> : <span className="step-state">Review</span>}</li>
                    <li className={project.artifactAvailable ? "test-step-done" : project.files.length ? "test-step-current" : "test-step-locked"}><span>2</span><div><strong>{project.artifactType === "resource_pack" || project.artifactType === "shader_pack" || project.artifactType === "datapack" ? "Package the files" : "Compile the project"}</strong><small>{project.artifactAvailable ? `An installable .${artifactExtension} file is ready.` : project.files.length ? project.status === "failed" ? "The build failed. Open Build to review the logs." : "Waiting for a compatible isolated build service." : "Available after source generation succeeds."}</small></div>{project.artifactAvailable ? <Check size={15} /> : <span className="step-state">{project.status === "failed" && project.files.length ? "Review" : "Waiting"}</span>}</li>
                    <li className={project.artifactAvailable ? "test-step-current" : "test-step-locked"}><span>3</span><div><strong>Install and test</strong><small>{project.artifactAvailable ? project.artifactType === "plugin" ? `Install the JAR on a Paper ${project.version} server you control.` : project.artifactType === "mod" ? `Install the JAR in the ${project.target} mods folder on the required client/server.` : project.artifactType === "datapack" ? "Place the ZIP in world/datapacks and run /reload." : project.artifactType === "resource_pack" ? "Import the ZIP using Minecraft’s Resource Packs screen." : `Install the ZIP through ${project.target} and check it in game.` : "Available after an installable artifact is ready."}</small></div>{project.artifactAvailable ? <span className="step-state">Next</span> : <span className="step-state">Locked</span>}</li>
                  </ol>
                  {!project.artifactAvailable && (
                    <div className="test-blocker" role="status">
                      <strong>{project.status === "failed" ? project.files.length ? "This build needs attention" : "Generation needs attention" : "A compiled JAR is not available yet"}</strong>
                      <p>{project.status === "failed" ? project.files.length ? "Review the build output for compiler errors. Once a build service is connected, ModHorizon can send those errors back for a repair." : project.error || "Review the conversation and try generating the plugin again." : "This starter build can generate and display source code, but it has no isolated compiler connected. A Minecraft server cannot load source files directly."}</p>
                      <button type="button" onClick={() => setTab(project.status === "failed" && project.files.length ? "logs" : project.files.length ? "code" : "conversation")}>{project.status === "failed" && project.files.length ? "Review build output" : project.files.length ? "Review generated source" : "Review generation"}<ArrowRight size={14} /></button>
                    </div>
                  )}
                  {project.artifactType === "plugin" ? <>
                    <div className="test-target-toggle" role="group" aria-label="Choose server setup">
                      <button type="button" aria-pressed={testTarget === "local"} className={testTarget === "local" ? "target-active" : ""} onClick={() => setTestTarget("local")}>Local Paper server</button>
                      <button type="button" aria-pressed={testTarget === "hosted"} className={testTarget === "hosted" ? "target-active" : ""} onClick={() => setTestTarget("hosted")}>My server host</button>
                    </div>
                    {testTarget === "local" ? (
                    <div className="test-instructions">
                      <h3>Run a private test server</h3>
                      <ol>
                        <li><strong>Install Java 21.</strong> Paper 1.21.x requires Java 21. <a href="https://adoptium.net/temurin/releases/?version=21" target="_blank" rel="noreferrer">Get Temurin 21 <ExternalLink size={12} /></a></li>
                        <li><strong>Download Paper {project.version}.</strong> Use Paper’s official setup guide and select the same Minecraft version as this project. <a href="https://docs.papermc.io/paper/getting-started/" target="_blank" rel="noreferrer">Paper server setup <ExternalLink size={12} /></a></li>
                        <li><strong>Start the server once, then stop it.</strong> If you agree to Mojang’s EULA, set <code>eula=true</code> in <code>eula.txt</code> and start it again.</li>
                        <li><strong>Install the plugin.</strong> Stop the server, place the downloaded JAR in its <code>plugins</code> folder, and start it again.</li>
                        <li><strong>Check it in game.</strong> Confirm the plugin is listed by <code>/plugins</code>, then try the behavior described in your prompt.</li>
                      </ol>
                    </div>
                    ) : (
                    <div className="test-instructions">
                      <h3>Install on a hosted server</h3>
                      <ol>
                        <li><strong>Back up your world</strong> and stop the server from your host’s control panel.</li>
                        <li><strong>Check compatibility.</strong> Use a Paper server on Minecraft {project.version} with Java 21.</li>
                        <li><strong>Upload the JAR</strong> into the server’s <code>plugins</code> folder using its file manager or SFTP.</li>
                        <li><strong>Start the server</strong> and check the console for plugin errors. In game, use <code>/plugins</code> to confirm it loaded.</li>
                        <li><strong>Test the mechanic</strong> in a private world before using it on a live server.</li>
                      </ol>
                    </div>
                    )}
                  </> : (
                    <div className="test-instructions">
                      <h3>{project.artifactType === "mod" ? "Install the mod" : project.artifactType === "datapack" ? "Install the datapack" : project.artifactType === "resource_pack" ? "Import the resource pack" : `Install with ${project.target}`}</h3>
                      <ol>
                        {project.artifactType === "mod" ? <>
                          <li>Install Minecraft {project.version} with the matching {project.target} loader.</li>
                          <li>Copy the downloaded JAR into the instance’s <code>mods</code> folder. Install it on each side required by the generated mod.</li>
                          <li>Launch a disposable test world and review the game log if it fails to load.</li>
                        </> : project.artifactType === "datapack" ? <>
                          <li>Place the ZIP directly in your test world's <code>datapacks</code> folder without unpacking it.</li>
                          <li>Run <code>/reload</code> and <code>/datapack list enabled</code> with commands enabled or operator permissions.</li>
                          <li>Follow the generated README to trigger the functions and verify the behavior in game.</li>
                        </> : project.artifactType === "resource_pack" ? <>
                          <li>Open Options → Resource Packs → Open Pack Folder.</li>
                          <li>Copy the downloaded ZIP into that folder, return to Minecraft, and enable the pack.</li>
                          <li>Check the changed resources in game. Diamond-tool recolors include PNGs; review the message for unsupported artwork or armor.</li>
                        </> : <>
                          <li>Install the selected shader runtime ({project.target}) for Minecraft {project.version}.</li>
                          <li>Copy the downloaded ZIP into the runtime’s <code>shaderpacks</code> folder and select it in video settings.</li>
                          <li>Check visual output and performance on your graphics hardware.</li>
                        </>}
                      </ol>
                    </div>
                  )}
                  <p className="test-safety"><ShieldCheck size={14} /> Review generated files first. Test plugins and mods in a disposable world or server; shader effects can vary by GPU.</p>
                </div>
              ) : tab === "logs" ? (
                <div className="build-logs">
                  <div className="logs-title">
                    <SquareTerminal size={17} />
                    <span>Build output</span>
                    <span className="tag">{project.status}</span>
                  </div>
                  {project.logs.map((log, i) => (
                    <pre key={i}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      {log}
                    </pre>
                  ))}
                  {project.error && (
                    <pre className="log-error">{project.error}</pre>
                  )}
                  <p>
                    Packaging or compilation is not a runtime test. Test this output with the matching Minecraft version and target.
                  </p>
                </div>
              ) : (
                <div className="source-workspace">
                  <nav
                    className="file-explorer"
                    aria-label="Generated source files"
                  >
                    <span className="explorer-label">EXPLORER</span>
                    <div className="explorer-root">
                      <ChevronDown size={13} />
                      <FolderOpen size={14} />
                      <strong>{project.name}</strong>
                    </div>
                    {project.files.map((f) => (
                      <button
                        key={f.path}
                        className={
                          f.path === selectedFile ? "file-selected" : ""
                        }
                        title={f.path}
                        onClick={() => setSelectedFile(f.path)}
                      >
                        {f.path.endsWith(".java") ? (
                          <FileCode2 size={14} />
                        ) : (
                          <FileText size={14} />
                        )}
                        <span>{fileLabel(f.path)}</span>
                      </button>
                    ))}
                    {!project.files.length && (
                      <p className="no-files">No files were generated.</p>
                    )}
                  </nav>
                  <div className="editor">
                    <div className="editor-file">
                      <span>
                        <FileCode2 size={14} />
                        {currentFile
                          ? fileLabel(currentFile.path)
                          : "No file selected"}
                      </span>
                      <div>
                        <span className="readonly">READ ONLY</span>
                        <button
                          className="icon-button"
                          aria-label="Copy source code"
                          disabled={!currentFile}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                currentFile?.content || "",
                              );
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            } catch {
                              setError(
                                "Clipboard unavailable. Select and copy the source manually.",
                              );
                            }
                          }}
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                    <div className="editor-code">
                      {currentFile ? (
                        <Highlight
                          code={currentFile.content}
                          path={currentFile.path}
                        />
                      ) : (
                        <div className="editor-empty">
                          <FileCode2 size={30} />
                          <p>Select a file to inspect its source.</p>
                        </div>
                      )}
                    </div>
                    <div className="editor-status">
                      <span>{currentFile?.path || "No generated files"}</span>
                      <span>
                        UTF-8{" "}
                        <span>
                          {currentFile?.path.endsWith(".java")
                            ? "Java"
                            : "Text"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        {storageError && (
          <div className="storage-notice" role="status">
            Browser storage is unavailable. Projects will only remain in this
            tab.
            <button
              className="icon-button"
              aria-label="Dismiss storage notice"
              onClick={() => setStorageError(false)}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </main>
      <dialog
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
        className="settings-dialog"
        aria-labelledby="dialog-title"
      >
        <div className="dialog-top">
          <span className="eyebrow">
            MODHORIZON / {modal === "guide" ? "QUICK START" : "CONFIGURATION"}
          </span>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setModal(null)}
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="dialog-title">
          {modal === "guide"
            ? "From idea to your server."
            : "Your development workspace."}
        </h2>
        {modal === "guide" ? (
          <>
            <p>
              Start with one clear mechanic. Specify what triggers it, what
              happens, and how long it lasts.
            </p>
            <ol className="guide-steps">
              <li>
                <strong>Describe your idea</strong>
                <span>
                  Choose Paper and a Minecraft 1.21.x version. The built-in
                  preview supports the zombie speed example.
                </span>
              </li>
              <li>
                <strong>Inspect the source</strong>
                <span>
                  Review the Java, plugin.yml, configuration, and build logs.
                  Source previews have not been compiled.
                </span>
              </li>
              <li>
                <strong>Build, then playtest</strong>
                <span>
                  Connect a secure build service for JARs. Test on a matching
                  local Paper server with Java 21.
                </span>
              </li>
            </ol>
            <Button
              onClick={() => {
                setModal(null);
                newProject();
                setPrompt(milestone);
              }}
            >
              Try the zombie speed example
              <ArrowRight size={15} />
            </Button>
            <a
              className="docs-link"
              href="https://docs.papermc.io/paper/getting-started/"
              target="_blank"
              rel="noreferrer"
            >
              Paper server setup
              <ExternalLink size={13} />
            </a>
          </>
        ) : (
          <>
            <div className="settings-row">
              <div><strong>Appearance</strong><span>Graphite · a neutral, monochrome workspace.</span></div>
              <span className="tag">Graphite</span>
            </div>
            <p>
              Provider settings live on the server. API keys are never entered
              or stored in this browser.
            </p>
            <div className="settings-row">
              <div>
                <strong>AI generation</strong>
                <span>
                  Choose a connected model in the prompt bar. Provider keys are
                  configured on the server and never entered in this browser.
                </span>
              </div>
              <Code2 size={18} />
            </div>
            <div className="settings-code">
              OPENAI_API_KEY=••••••••
              <br />
              ANTHROPIC_API_KEY=••••••••
              <br />
              GEMINI_API_KEY=••••••••
              <br />
              BUILD_SERVICE_URL=https://your-builder
            </div>
            <p className="muted">
              See <code>.env.example</code> and the README for provider setup.
              Restart the server after changing environment variables. Model
              selection calls the provider directly; credit billing is not
              active yet.
            </p>
            <div className="settings-row">
              <div>
                <strong>Project history</strong>
                <span>
                  Stored in this browser. Server build artifacts expire.
                </span>
              </div>
              <History size={18} />
            </div>
            <div className="settings-row">
              <div>
                <strong>Fabric & NeoForge</strong>
                <span>Coming soon. This release supports Paper only.</span>
              </div>
              <span className="tag">PLANNED</span>
            </div>
            <p className="settings-local">
              <ShieldCheck size={15} /> Local account placeholder ·
              authentication is not enabled.
            </p>
          </>
        )}
      </dialog>
      </div>
    </div>
  );
}
