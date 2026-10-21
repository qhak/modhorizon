"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUp,
  Blocks,
  Brain,
  Database,
  Palette,
  Puzzle,
  Sun,
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
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/types";
import {
  DEFAULT_PLATFORM,
  MINECRAFT_RELEASES,
  PLATFORMS,
  PLATFORM_GROUPS,
  describeTarget,
  incompatibility,
  isPlatformId,
  javaVersionFor,
  platformOf,
  versionLines,
  type PlatformId,
} from "@/lib/platforms";
import {
  MODEL_OPTIONS,
  REASONING_LABELS,
  reasoningFor,
  estimateCreditsForModel,
  type ModelOption,
  type ModelProvider,
  type ReasoningLevel,
} from "@/lib/models";
import { SITE_MEDIA } from "@/lib/site-media";


type SourceFile = { path: string; content: string };
type Message = { role: "user" | "assistant"; text: string };
type BillingAccountView = { plan: "free" | "starter" | "pro" | "studio"; credits: number; subscriptionStatus: string };
const milestone =
  "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.";
const suggestions: { title: string; description: string; prompt: string; platform: PlatformId }[] = [
  { title: "Zombie rewards", description: "Paper · Reward zombie kills with a speed boost", prompt: milestone, platform: "paper" },
  { title: "Ruby gear", description: "Fabric · A ruby ore, ingot and sword", prompt: "Create a Fabric mod that adds ruby ore, a ruby ingot smelted from it, and a ruby sword slightly stronger than iron.", platform: "fabric" },
  { title: "Lobby command", description: "Velocity · A /lobby command that sends players to the hub", prompt: "Create a Velocity plugin with a /lobby command that sends the player to a server named lobby, with a configurable message.", platform: "velocity" },
];

function Logo() {
  return (
    <Link href="/" className="brand" aria-label="ModHorizon home">
      <span className="brand-icon">
        <Blocks size={20} strokeWidth={1.8} />
      </span>
      <span>ModHorizon</span>
    </Link>
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

// Field values match the generation API's artifactType contract.
const CONTENT_TYPES = [
  { id: "plugin", label: "Plugin", icon: Puzzle, image: SITE_MEDIA.types.plugins.src, loaders: "" },
  { id: "mod", label: "Mod", icon: Blocks, image: SITE_MEDIA.types.mods.src, loaders: "" },
  { id: "shader_pack", label: "Shader", icon: Sun, image: SITE_MEDIA.types.shaders.src, loaders: "Iris · Oculus · OptiFine" },
  { id: "resource_pack", label: "Texture pack", icon: Palette, image: SITE_MEDIA.types.texturePacks.src, loaders: "Vanilla resource pack" },
  { id: "datapack", label: "Datapack", icon: Database, image: SITE_MEDIA.types.datapacks.src, loaders: "Vanilla datapack" },
] as const;
type ContentType = (typeof CONTENT_TYPES)[number]["id"];
const CODE_TYPES: readonly ContentType[] = ["plugin", "mod"];

function ContentTypeSlider({ value, onChange, supported, disabled }: {
  value: ContentType;
  onChange: (type: ContentType) => void;
  supported: readonly string[];
  disabled: boolean;
}) {
  return (
    <div className="type-slider" role="group" aria-label="What are you making?">
      {CONTENT_TYPES.map((type) => (
        <button
          key={type.id}
          type="button"
          aria-pressed={value === type.id}
          className={`type-chip ${value === type.id ? "active" : ""}`}
          disabled={disabled}
          onClick={() => onChange(type.id)}
        >
          <span className="type-thumb" style={{ backgroundImage: `url(${type.image})` }} aria-hidden="true" />
          <type.icon size={15} aria-hidden="true" />
          <span>{type.label}</span>
          {!supported.includes(type.id) && <small>Soon</small>}
        </button>
      ))}
    </div>
  );
}

function ReasoningPicker({ modelId, value, onChange, disabled }: {
  modelId: string; value: ReasoningLevel; onChange: (level: ReasoningLevel) => void; disabled: boolean;
}) {
  const reasoning = reasoningFor(modelId);
  if (!reasoning) return null;
  return <label className="version-picker reasoning-picker" title="How much the model thinks before it answers">
    <Brain size={13} aria-hidden="true" />
    <span className="sr-only">Reasoning effort</span>
    <select value={reasoning.levels.includes(value) ? value : reasoning.default} onChange={(event) => onChange(event.target.value as ReasoningLevel)} disabled={disabled}>
      {reasoning.levels.map((level) => <option key={level} value={level}>{REASONING_LABELS[level]} reasoning</option>)}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}

function PlatformPicker({ value, onChange, disabled, kinds }: {
  value: PlatformId; onChange: (platform: PlatformId) => void; disabled: boolean; kinds: readonly string[];
}) {
  return <label className="version-picker platform-picker">
    <span className="sr-only">Platform</span>
    <select value={value} onChange={(event) => { if (isPlatformId(event.target.value)) onChange(event.target.value); }} disabled={disabled}>
      {PLATFORM_GROUPS.filter((group) => kinds.includes(group.kind)).map((group) => (
        <optgroup key={group.kind} label={group.label}>
          {group.ids.map((id) => <option key={id} value={id}>{PLATFORMS[id].label}</option>)}
        </optgroup>
      ))}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}

/** Lists every Minecraft release so unsupported picks can be explained, not hidden. */
function VersionPicker({ platform, value, onChange, disabled, anyRelease = false }: {
  platform: PlatformId; value: string; onChange: (version: string) => void; disabled: boolean; anyRelease?: boolean;
}) {
  const { kind, label } = PLATFORMS[platform];
  const versions: readonly string[] = anyRelease ? MINECRAFT_RELEASES : PLATFORMS[platform].versions;
  const choices = kind === "proxy" && !anyRelease ? versions : MINECRAFT_RELEASES;
  return <label className="version-picker">
    <span className="sr-only">{kind === "proxy" ? `${label} API version` : "Minecraft version"}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {versionLines(choices).map(({ line, versions: group }) => (
        <optgroup key={line} label={kind === "proxy" ? `${label} ${line}` : `Minecraft ${line}`}>
          {group.map((version) => (
            <option key={version} value={version}>
              {versions.includes(version) ? version : `${version} · not on ${label}`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
    <ChevronDown size={13} aria-hidden="true" />
  </label>;
}

function CompatibilityNotice({ platform, version, onVersion, onPlatform }: {
  platform: PlatformId;
  version: string;
  onVersion: (version: string) => void;
  onPlatform: (platform: PlatformId) => void;
}) {
  const [explained, setExplained] = useState(false);
  const problem = incompatibility(platform, version);
  if (!problem) return null;
  return (
    <div className="compat-notice" role="alert">
      <div className="compat-head">
        <TriangleAlert size={15} aria-hidden="true" />
        <strong>{problem.title}</strong>
        <button type="button" className="compat-why" aria-expanded={explained} aria-controls="compat-reason" onClick={() => setExplained((open) => !open)}>
          {explained ? "Hide" : "Why?"}
        </button>
      </div>
      {explained && <p id="compat-reason">{problem.reason}</p>}
      <div className="compat-actions">
        {problem.nearest && (
          <button type="button" onClick={() => onVersion(problem.nearest!)}>
            Use {PLATFORMS[platform].label} {problem.nearest}
          </button>
        )}
        {problem.alternatives.slice(0, 3).map((id) => (
          <button type="button" key={id} onClick={() => onPlatform(id)}>
            Switch to {PLATFORMS[id].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ModelPicker({
  value,
  onChange,
  onSetup,
  choices,
  disabled,
  paidAccess,
  reasoningEffort,
}: {
  value: string;
  onChange: (modelId: string) => void;
  onSetup: () => void;
  choices: Record<string, boolean>;
  disabled: boolean;
  paidAccess: boolean;
  reasoningEffort: ReasoningLevel;
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
                disabled={!choices[model.id] || (model.group !== "Economy" && !paidAccess)}
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
                  {(() => {
                    const reasoning = reasoningFor(model.id);
                    return reasoning && (
                      <small className="model-option-reasoning">
                        <Brain size={11} aria-hidden="true" />
                        Reasoning: {REASONING_LABELS[reasoning.levels[0]]} – {REASONING_LABELS[reasoning.levels.at(-1)!]}
                      </small>
                    );
                  })()}
                </span>
                <span className="model-option-price">
                  {estimateCreditsForModel(model.id, 1_500, 5_000, reasoningEffort) ?? "—"} credits / pass
                </span>
                {model.group !== "Economy" && !paidAccess ? (
                  <span className="model-connect-label">Paid plan</span>
                ) : choices[model.id] ? (
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
          <p className="model-pricing-note">Estimate at {reasoningEffort} reasoning. Longer prompts and repairs can use more.</p>
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

function TestGuide({ project, target, onTarget }: {
  project: Project;
  target: "local" | "hosted";
  onTarget: (target: "local" | "hosted") => void;
}) {
  const platform = platformOf(project.platform);
  const java = javaVersionFor(platform.id, project.version);
  const javaLink = <a href={`https://adoptium.net/temurin/releases/?version=${java}`} target="_blank" rel="noreferrer">Get Temurin {java} <ExternalLink size={12} /></a>;
  const setupLink = <a href={platform.setupUrl} target="_blank" rel="noreferrer">{platform.label} setup <ExternalLink size={12} /></a>;
  const folder = platform.kind === "mod" ? "mods" : "plugins";
  const loaded = platform.kind === "mod"
    ? <>Open the <strong>Mods</strong> list from the title screen, or check the log for the mod loading,</>
    : platform.kind === "proxy"
      ? <>Check the proxy console for the plugin enabling without errors,</>
      : <>Confirm the plugin is listed by <code>{platform.family === "sponge" ? "/sponge plugins" : "/plugins"}</code>,</>;
  return (
    <>
      <div className="test-target-toggle" role="group" aria-label="Choose test setup">
        <button type="button" aria-pressed={target === "local"} className={target === "local" ? "target-active" : ""} onClick={() => onTarget("local")}>{platform.kind === "mod" ? "Local game" : `Local ${platform.label} ${platform.kind === "proxy" ? "proxy" : "server"}`}</button>
        <button type="button" aria-pressed={target === "hosted"} className={target === "hosted" ? "target-active" : ""} onClick={() => onTarget("hosted")}>My server host</button>
      </div>
      {target === "local" ? (
        <div className="test-instructions">
          <h3>{platform.kind === "mod" ? `Run ${platform.label} ${project.version} locally` : `Run a private ${platform.label} ${platform.kind === "proxy" ? "proxy" : "server"}`}</h3>
          <ol>
            <li><strong>Install Java {java}.</strong> {describeTarget(platform.id, project.version)} needs Java {java}. {javaLink}</li>
            {platform.kind === "mod" ? (
              <li><strong>Install {platform.label} for Minecraft {project.version}.</strong> Use the official installer to create a {platform.label} profile in your launcher. {setupLink}</li>
            ) : platform.kind === "proxy" ? (
              <li><strong>Download {platform.label} {project.version}</strong> and run it in front of at least one backend server with forwarding configured. {setupLink}</li>
            ) : (
              <li><strong>Download {platform.label} {project.version}.</strong> Use the official setup guide and select the same Minecraft version as this project. {setupLink}</li>
            )}
            {platform.kind !== "mod" && <li><strong>Start it once, then stop it.</strong> {platform.kind === "plugin" && <>If you agree to Mojang’s EULA, set <code>eula=true</code> in <code>eula.txt</code>.</>}</li>}
            <li><strong>Install the {platform.kind === "mod" ? "mod" : "plugin"}.</strong> Place the downloaded JAR in the <code>{folder}</code> folder{platform.kind === "mod" ? " of your game directory (and of a server, if it adds server-side features)" : ""}, then start {platform.kind === "mod" ? "the game with the " + platform.label + " profile" : "it again"}.</li>
            <li><strong>Check it in game.</strong> {loaded} then try the behavior described in your prompt.</li>
          </ol>
        </div>
      ) : (
        <div className="test-instructions">
          <h3>Install on a hosted {platform.kind === "proxy" ? "proxy" : "server"}</h3>
          <ol>
            <li><strong>Back up your world</strong> and stop the server from your host’s control panel.</li>
            <li><strong>Check compatibility.</strong> The host must run {describeTarget(platform.id, project.version)} on Java {java}.</li>
            <li><strong>Upload the JAR</strong> into the server’s <code>{folder}</code> folder using its file manager or SFTP.{platform.kind === "mod" && " Players need the same mod installed if it adds items, blocks or client features."}</li>
            <li><strong>Start the server</strong> and check the console for errors before anyone joins.</li>
            <li><strong>Test the mechanic</strong> in a private world before using it on a live server.</li>
          </ol>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState<PlatformId>(DEFAULT_PLATFORM);
  const [version, setVersion] = useState<string>(PLATFORMS[DEFAULT_PLATFORM].versions[0]);
  const [selectedModel, setSelectedModel] = useState("demo");
  const [reasoning, setReasoning] = useState<ReasoningLevel>("medium");
  const [contentType, setContentType] = useState<ContentType>("plugin");
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
    /** Content types the generation API can build; plugins and mods when it doesn't say. */
    artifactTypes?: string[];
  } | null>(null);
  const [billingAccount, setBillingAccount] = useState<BillingAccountView | null>(null);
  const paidAccess = Boolean(billingAccount && billingAccount.plan !== "free" && ["active", "trialing"].includes(billingAccount.subscriptionStatus));
  const generationUnavailable = !services?.choices[selectedModel];
  const versionProblem = incompatibility(platform, version);
  const supportedTypes = services?.artifactTypes ?? CODE_TYPES;
  const typeUnavailable = !supportedTypes.includes(contentType);
  const contentLabel = CONTENT_TYPES.find((type) => type.id === contentType)!.label;
  const input = useRef<HTMLTextAreaElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

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
    const options = reasoningFor(selectedModel);
    if (options) setReasoning(options.default);
  }, [selectedModel]);

  useEffect(() => {
    // Landing-page links prefill the composer with ?prompt=, ?platform= and ?version=.
    const query = new URLSearchParams(window.location.search);
    const shared = query.get("prompt");
    const sharedPlatform = query.get("platform");
    const sharedVersion = query.get("version");
    if (shared) setPrompt(shared.slice(0, 4000));
    if (isPlatformId(sharedPlatform)) {
      choosePlatform(sharedPlatform);
      if (sharedVersion && PLATFORMS[sharedPlatform].versions.includes(sharedVersion)) setVersion(sharedVersion);
    }
    if (shared || sharedPlatform) window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    fetch("/api/billing/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (data.account) setBillingAccount(data.account); })
      .catch(() => { /* Billing remains unavailable until the D1 binding is configured. */ });
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
  }, [busy, modal]);

  function choosePlatform(next: PlatformId) {
    setPlatform(next);
    setContentType(PLATFORMS[next].kind === "mod" ? "mod" : "plugin");
    // Keep the Minecraft version so an unsupported pick is explained; proxies use their own API versions.
    setVersion((current) => {
      const target = PLATFORMS[next];
      const wasProxy = !MINECRAFT_RELEASES.includes(current as (typeof MINECRAFT_RELEASES)[number]);
      return target.kind === "proxy" || wasProxy
        ? target.versions.includes(current) ? current : target.versions[0]
        : current;
    });
  }
  function chooseContentType(next: ContentType) {
    if (next === "plugin" && PLATFORMS[platform].kind === "mod") choosePlatform("paper");
    else if (next === "mod" && PLATFORMS[platform].kind !== "mod") choosePlatform("fabric");
    setContentType(next);
  }
  function newProject() {
    setProject(null);
    setPrompt("");
    setMessages([]);
    setError("");
    setMobileNav(false);
    setTimeout(() => input.current?.focus(), 0);
  }
  function openProject(p: Project) {
    setProject(p);
    setPlatform(platformOf(p.platform).id);
    setVersion(p.version);
    if (p.modelId && MODEL_OPTIONS.some((model) => model.id === p.modelId))
      setSelectedModel(p.modelId);
    if (p.reasoningEffort) setReasoning(p.reasoningEffort);
    setMessages([
      { role: "user", text: p.prompt },
      {
        role: "assistant",
        text:
          p.error ||
          (p.status === "success"
            ? `The build service compiled this project. Download it and verify its behavior on ${describeTarget(platformOf(p.platform).id, p.version)}.`
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
    const current = project;
    if (busy || generationUnavailable || prompt.trim().length < 12 || (!current && (versionProblem || typeUnavailable))) return;
    const text = prompt.trim();
    if (current) setTab("conversation");
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          platform: current ? platformOf(current.platform).id : platform,
          version: current?.version || version,
          modelId: selectedModel,
          // Read by the generation API; this build's server ignores fields it doesn't use.
          artifactType: current ? (platformOf(current.platform).kind === "mod" ? "mod" : "plugin") : contentType,
          ...(reasoningFor(selectedModel) ? { reasoningEffort: reasoning } : {}),
          ...(current
            ? { project: { name: current.name, files: current.files } }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.project)
        throw new Error(data.error || "Generation failed. Please try again.");
      const next: Project = data.project;
      fetch("/api/billing/account", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.account) setBillingAccount(data.account); }).catch(() => undefined);
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
              ? `Your project compiled successfully. Review the source and test it on ${describeTarget(platformOf(next.platform).id, next.version)} before use.`
              : next.provider === "mock"
                ? "Your source preview is ready. The development provider generated a zombie speed-boost example. No compilation has run and no JAR is available."
                : "Your AI-generated source is ready. No build service is configured, so compilation has not run and no JAR is available."),
        },
      ]);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }
  const currentFile = project?.files.find((f) => f.path === selectedFile);
  const statusLabel =
    project?.status === "success"
      ? "Build passed"
      : project?.status === "failed"
        ? "Build failed"
        : "Source preview";

  return (
    <div className="app-shell">
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
        <button className="nav-item" aria-expanded={showSearch} onClick={() => setShowSearch(!showSearch)}>
          <Folder size={16} /><span>Projects</span><span className="nav-count">{projects.length}</span>
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
          {projects
            .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
            .map((p) => (
              <button
                disabled={busy}
                key={p.id}
                className={`project-item ${project?.id === p.id ? "project-active" : ""}`}
                onClick={() => openProject(p)}
              >
                <Folder size={15} />
                <span>{p.name}</span>
                <span className={`project-dot ${p.status}`} />
              </button>
            ))}
          {projects.length === 0 && (
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
          <Link className="nav-item" href="/pricing">
            <Sparkles size={16} />
            <span>Plans & credits</span>
          </Link>
          <button className="account" onClick={() => setModal("settings")} aria-label="Account and credits">
            <div className="avatar">D</div>
            <div><strong>Guest developer</strong><span>{billingAccount ? `${billingAccount.plan[0].toUpperCase()}${billingAccount.plan.slice(1)} · ${billingAccount.credits} credits` : "Connecting account…"}</span></div>
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
            <span>{project?.name || "New project"}</span>
            {project && <span className="tag paper-tag">{platformOf(project.platform).label}</span>}
          </div>
          <div className="topbar-right">
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
                  <h1>What will you create?</h1>
                  <p>Describe your idea. Pick a loader and any Minecraft version.</p>
                </div>
              </div>
              <ContentTypeSlider
                value={contentType}
                onChange={chooseContentType}
                supported={supportedTypes}
                disabled={busy}
              />
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate();
                }}
              >
                <textarea
                  ref={input}
                  aria-label={`Describe your Minecraft ${contentLabel.toLowerCase()}`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={4000}
                  placeholder={
                    contentType === "shader_pack" ? "A shader pack with warm sunsets, soft shadows and waving leaves…"
                      : contentType === "resource_pack" ? "A texture pack that makes ores glow and gives tools a clean, flat look…"
                        : contentType === "datapack" ? "A datapack that adds a crafting recipe for saddles and a daily login reward…"
                          : PLATFORMS[platform].kind === "mod" ? "A mod that adds a sword which sets mobs on fire…"
                            : PLATFORMS[platform].kind === "proxy" ? "A proxy plugin with a /lobby command that sends players to the hub…"
                              : "A plugin that gives players a speed boost when they defeat a zombie…"
                  }
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
                    {CODE_TYPES.includes(contentType) ? (
                      <PlatformPicker
                        value={platform}
                        onChange={choosePlatform}
                        disabled={busy}
                        kinds={contentType === "mod" ? ["mod"] : ["plugin", "proxy"]}
                      />
                    ) : (
                      <span className="platform-pill">{CONTENT_TYPES.find((type) => type.id === contentType)!.loaders}</span>
                    )}
                    <span className="select-separator" />
                    <VersionPicker
                      platform={platform}
                      value={version}
                      onChange={setVersion}
                      disabled={busy}
                      anyRelease={!CODE_TYPES.includes(contentType)}
                    />
                    <span className="select-separator" />
                    <ModelPicker
                      value={selectedModel}
                      onChange={setSelectedModel}
                      onSetup={() => setModal("settings")}
                      choices={services?.choices || {}}
                      disabled={busy}
                      paidAccess={paidAccess}
                      reasoningEffort={reasoning}
                    />
                    <ReasoningPicker modelId={selectedModel} value={reasoning} onChange={setReasoning} disabled={busy} />
                  </div>
                  <Button
                    type="submit"
                    disabled={busy || generationUnavailable || typeUnavailable || Boolean(versionProblem && !typeUnavailable) || prompt.trim().length < 12}
                    title={typeUnavailable ? `${contentLabel} generation isn't available in this build yet.` : versionProblem ? versionProblem.title : generationUnavailable ? "Connect an AI provider in the server configuration to enable generation." : undefined}
                  >
                    {busy ? (
                      <LoaderCircle size={16} className="spin" />
                    ) : null}
                    <span>{busy ? "Generating…" : "Generate"}</span>
                    {!busy && <ArrowUp size={15} />}
                  </Button>
                </div>
              </form>
              {typeUnavailable ? (
                <div className="compat-notice" role="status">
                  <div className="compat-head">
                    <TriangleAlert size={15} aria-hidden="true" />
                    <strong>{contentLabel} generation isn&apos;t connected in this build yet.</strong>
                  </div>
                  <p>It runs on the new generation API. Plugins and mods work here today.</p>
                  <div className="compat-actions">
                    <button type="button" onClick={() => chooseContentType("plugin")}>Make a plugin</button>
                    <button type="button" onClick={() => chooseContentType("mod")}>Make a mod</button>
                  </div>
                </div>
              ) : (
                <CompatibilityNotice
                  key={`${platform}-${version}`}
                  platform={platform}
                  version={version}
                  onVersion={setVersion}
                  onPlatform={choosePlatform}
                />
              )}
              <div className="composer-meta">
                <span className="composer-meta-right">
                  <span className="provider-note">{services?.message || "Checking provider…"}</span>
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
                  <h2>A few ideas to start with</h2>
                </div>
                <div className="starter-list">
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s.title}
                    className="starter-prompt"
                    disabled={busy}
                    onClick={() => {
                      setPrompt(s.prompt);
                      choosePlatform(s.platform);
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
                        ? "No compiled artifact. Connect the isolated build service."
                        : "Download compiled plugin"
                    }
                    onClick={() => {
                      window.location.href = `/api/projects/${project.id}/download`;
                    }}
                  >
                    <ArrowDownToLine size={14} />
                    <span>Download .jar</span>
                  </Button>
                </div>
              </div>
            <section className="chat-panel" id="panel-conversation" role="tabpanel" aria-labelledby="tab-conversation" hidden={tab !== "conversation"}>
              <div className="panel-heading">
                <span>
                  <Sparkles size={15} /> Build with ModHorizon
                </span>
                <span className="tag">{platformOf(project.platform).label} {project.version}</span>
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
                  placeholder="Describe a change…"
                />
                <div>
                  <div className="followup-pickers">
                    <ModelPicker
                      value={selectedModel}
                      onChange={setSelectedModel}
                      onSetup={() => setModal("settings")}
                      choices={services?.choices || {}}
                      disabled={busy}
                      paidAccess={paidAccess}
                      reasoningEffort={reasoning}
                    />
                    <ReasoningPicker modelId={selectedModel} value={reasoning} onChange={setReasoning} disabled={busy} />
                  </div>
                  <Button
                    size="icon"
                    aria-label="Send follow-up"
                    disabled={busy || generationUnavailable || prompt.trim().length < 12}
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
                    ? "Compiled by build service. Verify in-game behavior."
                    : project.status === "failed"
                      ? "Check the logs for details."
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
              {tab === "test" ? (
                <div className="test-workflow">
                  <div className="test-workflow-heading">
                    <div>
                      <span className="eyebrow">FROM PROMPT TO PLAYTEST</span>
                      <h2>Test your plugin</h2>
                      <p>Follow the steps in order. ModHorizon will show when a compiled JAR is ready to install.</p>
                    </div>
                    {project.artifactAvailable && (
                      <Button size="sm" onClick={() => { window.location.href = `/api/projects/${project.id}/download`; }}>
                        <ArrowDownToLine size={14} /> Download .jar
                      </Button>
                    )}
                  </div>
                  <ol className="test-steps" aria-label="Plugin testing progress">
                    <li className={project.files.length ? "test-step-done" : "test-step-current"}><span>1</span><div><strong>Describe and generate</strong><small>{project.files.length ? "Source files are ready for review." : "Generation did not return source files. Review the conversation and try again."}</small></div>{project.files.length ? <Check size={15} /> : <span className="step-state">Review</span>}</li>
                    <li className={project.artifactAvailable ? "test-step-done" : project.files.length ? "test-step-current" : "test-step-locked"}><span>2</span><div><strong>Compile the plugin</strong><small>{project.artifactAvailable ? "A JAR was returned by the build service." : project.files.length ? project.status === "failed" ? "The build failed. Open Build to review the logs." : "Waiting for an isolated build service. Source preview is not a JAR." : "Available after source generation succeeds."}</small></div>{project.artifactAvailable ? <Check size={15} /> : <span className="step-state">{project.status === "failed" && project.files.length ? "Review" : "Waiting"}</span>}</li>
                    <li className={project.artifactAvailable ? "test-step-current" : "test-step-locked"}><span>3</span><div><strong>Install and playtest</strong><small>{project.artifactAvailable ? `Install the JAR on ${describeTarget(platformOf(project.platform).id, project.version)} that you control, then check the behavior in game.` : "Available after a compiled JAR is ready."}</small></div>{project.artifactAvailable ? <span className="step-state">Next</span> : <span className="step-state">Locked</span>}</li>
                  </ol>
                  {!project.artifactAvailable && (
                    <div className="test-blocker" role="status">
                      <strong>{project.status === "failed" ? project.files.length ? "This build needs attention" : "Generation needs attention" : "A compiled JAR is not available yet"}</strong>
                      <p>{project.status === "failed" ? project.files.length ? "Review the build output for compiler errors. Once a build service is connected, ModHorizon can send those errors back for a repair." : project.error || "Review the conversation and try generating the plugin again." : "This starter build can generate and display source code, but it has no isolated compiler connected. A Minecraft server cannot load source files directly."}</p>
                      <button type="button" onClick={() => setTab(project.status === "failed" && project.files.length ? "logs" : project.files.length ? "code" : "conversation")}>{project.status === "failed" && project.files.length ? "Review build output" : project.files.length ? "Review generated source" : "Review generation"}<ArrowRight size={14} /></button>
                    </div>
                  )}
                  <TestGuide project={project} target={testTarget} onTarget={setTestTarget} />
                  <p className="test-safety"><ShieldCheck size={14} /> Generated code runs with full access to your {platformOf(project.platform).kind === "mod" ? "game and server" : "server"}. Review the source and test it somewhere you control before installing it on a live server.</p>
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
                    Compilation is not a behavior test. Always test on a local
                    {platformOf(project.platform).kind === "mod" ? " instance" : " server"} first.
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
                  Choose a loader and a Minecraft version. If the pair is not
                  compatible, ModHorizon tells you why. The built-in preview
                  supports the Paper zombie speed example.
                </span>
              </li>
              <li>
                <strong>Inspect the source</strong>
                <span>
                  Review the Java, the plugin or mod descriptor, configuration, and build logs.
                  Source previews have not been compiled.
                </span>
              </li>
              <li>
                <strong>Build, then playtest</strong>
                <span>
                  Connect a secure build service for JARs. Test on a matching
                  local server or game instance first.
                </span>
              </li>
            </ol>
            <Button
              onClick={() => {
                setModal(null);
                newProject();
                choosePlatform("paper");
                setVersion(PLATFORMS.paper.versions[0]);
                setPrompt(milestone);
              }}
            >
              Try the zombie speed example
              <ArrowRight size={15} />
            </Button>
            <a
              className="docs-link"
              href={PLATFORMS[platform].setupUrl}
              target="_blank"
              rel="noreferrer"
            >
              {PLATFORMS[platform].label} setup
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
              Credits are charged from estimated provider token usage. See <Link href="/pricing">plans and credit rates</Link>.
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
                <strong>Platforms</strong>
                <span>{Object.values(PLATFORMS).map((entry) => entry.label).join(", ")}.</span>
              </div>
              <span className="tag">{Object.keys(PLATFORMS).length} LOADERS</span>
            </div>
            <p className="settings-local">
              <ShieldCheck size={15} /> Local account placeholder ·
              authentication is not enabled.
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
