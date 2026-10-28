"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  AlignLeft,
  Blocks,
  Brain,
  FlaskConical,
  Gamepad2,
  House,
  Layers,
  MessageSquare,
  Network,
  Server,
  Database,
  Palette,
  Puzzle,
  Sun,
  Check,
  ChevronDown,
  ChevronRight,
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
  PanelLeftOpen,
  Plus,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  TriangleAlert,
  X,
  Box,
  Coffee,
  CornerDownRight,
  Ghost,
  Grid3x3,
  Image as ImageIcon,
  KeyRound,
  Keyboard,
  Lightbulb,
  Package,
  PackageOpen,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
  Sword,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ArtifactTarget, Project } from "@/lib/types";
import { dataPackFormat } from "@/lib/datapack-versions";
import {
  DEFAULT_PLATFORM,
  MINECRAFT_RELEASES,
  PLATFORMS,
  PLATFORM_GROUPS,
  compareVersions,
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
  defaultReasoningForArtifact,
  estimateCreditsForModel,
  type ModelOption,
  type ModelProvider,
  type ReasoningLevel,
} from "@/lib/models";
import { TESTING_MODEL_IDS } from "@/lib/model-access";
import { VoidBackdrop } from "@/components/void-backdrop";
import { ShaderFeatureReport } from "@/components/shader-feature-report";
import { ATTACHMENT_BUDGET, MAX_ATTACHMENTS, validateAttachments } from "@/lib/reference-attachments";
import { BrandMark } from "@/components/brand-mark";
import { parseReply } from "@/lib/chat-commands";


type SourceFile = { path: string; content: string };
/** reply is the model's own note about the build, with workspace commands. */
type Message = { role: "user" | "assistant"; text: string; reply?: string };
type BillingAccountView = { plan: "free" | "starter" | "pro" | "studio"; credits: number; subscriptionStatus: string; email?: string | null };
const milestone =
  "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.";

function Logo() {
  return (
    <Link href="/" className="brand" aria-label="ModHorizon home">
      <BrandMark size={24} />
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
  { id: "plugin", label: "Plugin", icon: Puzzle, loaders: "" },
  { id: "mod", label: "Mod", icon: Blocks, loaders: "" },
  { id: "shader_pack", label: "Shader", icon: Sun, loaders: "Iris · Oculus · OptiFine" },
  { id: "resource_pack", label: "Texture pack", icon: Palette, loaders: "Vanilla resource pack" },
  { id: "datapack", label: "Datapack", icon: Database, loaders: "Vanilla datapack" },
] as const;
type ContentType = (typeof CONTENT_TYPES)[number]["id"];
const CODE_TYPES: readonly ContentType[] = ["plugin", "mod"];
// Pack runtimes the generation API expects. Iris shader packs also load in Oculus and OptiFine.
const PACK_TARGETS: Partial<Record<ContentType, ArtifactTarget>> = { shader_pack: "iris", resource_pack: "vanilla", datapack: "vanilla" };
const isCodeProject = (project: Project) => project.artifactType === "plugin" || project.artifactType === "mod";
/** The loader for plugins and mods, or the kind of pack. */
function projectTargetLabel(project: Project) {
  if (isPlatformId(project.target)) return PLATFORMS[project.target].label;
  return project.artifactType === "datapack" ? "Datapack" : project.artifactType === "shader_pack" ? "Shader pack" : "Resource pack";
}

type MenuOption = { value: string; label: string; detail?: string; meta?: string; icon?: ReactNode; muted?: boolean };
type MenuGroup = { label?: string; options: MenuOption[] };

/** A chip that opens the same custom panel as the model picker. */
function ChipMenu({ label, heading, icon, display, value, groups, onChange, disabled, title, compact = false }: {
  label: string;
  heading: string;
  icon?: ReactNode;
  display: string;
  value: string;
  groups: MenuGroup[];
  onChange: (value: string) => void;
  disabled: boolean;
  title?: string;
  /** Single-line rows for long lists such as versions. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const focusTrigger = () => root.current?.querySelector<HTMLButtonElement>(".chip-select")?.focus();

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); focusTrigger(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    const active = root.current?.querySelector<HTMLButtonElement>('.model-option[aria-pressed="true"]') ?? root.current?.querySelector<HTMLButtonElement>(".model-option");
    active?.focus();
    active?.scrollIntoView({ block: "nearest" });
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      className="chip-menu"
      ref={root}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}
      onKeyDown={(event) => {
        if (!open || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const options = Array.from(root.current?.querySelectorAll<HTMLButtonElement>(".model-option") || []);
        const index = options.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
        options[next]?.focus();
      }}
    >
      <button
        type="button"
        className="chip-select"
        aria-label={`${label}: ${display}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        title={title}
        onClick={() => setOpen((current) => !current)}
      >
        {icon && <span className="chip-select-icon">{icon}</span>}
        <span>{display}</span>
        <ChevronDown size={13} className="chip-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div id={menuId} className={`model-options chip-menu-options ${compact ? "is-compact" : ""}`} role="dialog" aria-label={label}>
          <div className="model-options-heading"><strong>{heading}</strong></div>
          {groups.map((group, groupIndex) => (
            <div key={group.label ?? groupIndex}>
              {group.label && <span className="model-group-label">{group.label}</span>}
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={value === option.value}
                  className={`model-option ${value === option.value ? "model-option-active" : ""} ${option.muted ? "is-muted" : ""}`}
                  onClick={() => { onChange(option.value); setOpen(false); focusTrigger(); }}
                >
                  {option.icon && <span className="chip-menu-icon" aria-hidden="true">{option.icon}</span>}
                  <span className="model-option-main">
                    <strong>{option.label}</strong>
                    {option.detail && <small>{option.detail}</small>}
                  </span>
                  {option.meta && <span className="model-option-price">{option.meta}</span>}
                  {value === option.value && <Check size={14} aria-hidden="true" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentTypePicker({ value, onChange, disabled }: {
  value: ContentType;
  onChange: (type: ContentType) => void;
  disabled: boolean;
}) {
  const current = CONTENT_TYPES.find((type) => type.id === value)!;
  return (
    <ChipMenu
      label="What are you making?"
      heading="Type"
      icon={<current.icon size={14} aria-hidden="true" />}
      display={current.label}
      value={value}
      onChange={(next) => onChange(next as ContentType)}
      disabled={disabled}
      groups={[{ options: CONTENT_TYPES.map((type) => ({ value: type.id, label: type.label, detail: type.loaders || undefined, icon: <type.icon size={15} /> })) }]}
    />
  );
}

function ReasoningPicker({ modelId, value, onChange, disabled }: {
  modelId: string; value: ReasoningLevel; onChange: (level: ReasoningLevel) => void; disabled: boolean;
}) {
  const reasoning = reasoningFor(modelId);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const focusSliderOnOpen = useRef(false);
  const panelId = useId();

  useEffect(() => {
    if (!reasoningFor(modelId)) setOpen(false);
  }, [modelId]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>(".chip-select")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    if (focusSliderOnOpen.current) {
      root.current?.querySelector<HTMLInputElement>(".reasoning-range")?.focus();
      focusSliderOnOpen.current = false;
    }
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!reasoning) return null;
  const current = reasoning.levels.includes(value) ? value : reasoning.default;
  const currentIndex = reasoning.levels.indexOf(current);
  const defaultIndex = reasoning.levels.indexOf(reasoning.default);
  const modelLabel = MODEL_OPTIONS.find((model) => model.id === modelId)?.label || "Selected model";

  return (
    <div
      className="reasoning-picker"
      ref={root}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }}
    >
      <button
        type="button"
        className="chip-select"
        aria-label={`Reasoning effort: ${REASONING_LABELS[current]}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        disabled={disabled}
        title="How much the model thinks before it answers"
        onClick={(event) => {
          focusSliderOnOpen.current = event.detail === 0;
          setOpen((wasOpen) => !wasOpen);
        }}
      >
        <span className="chip-select-icon"><Brain size={14} aria-hidden="true" /></span>
        <span>{REASONING_LABELS[current]}</span>
        <ChevronDown size={13} className="chip-chevron" aria-hidden="true" />
      </button>
      {open && (
        <div id={panelId} className="reasoning-popover model-options" role="dialog" aria-label={`Reasoning effort for ${modelLabel}`}>
          <div className="reasoning-card-heading">
            <span className="reasoning-card-icon" aria-hidden="true"><Brain size={14} /></span>
            <div className="reasoning-card-current" aria-live="polite">
              <strong>{REASONING_LABELS[current]}</strong>
              <span>{modelLabel}<ChevronRight size={12} aria-hidden="true" /></span>
            </div>
            <button
              type="button"
              className="reasoning-reset"
              aria-label={`Reset reasoning to default (${REASONING_LABELS[reasoning.default]})`}
              title={`Reset to ${REASONING_LABELS[reasoning.default]}`}
              disabled={currentIndex === defaultIndex}
              onClick={() => {
                root.current?.querySelector<HTMLInputElement>(".reasoning-range")?.focus();
                onChange(reasoning.default);
              }}
            ><RotateCcw size={14} aria-hidden="true" /></button>
          </div>
          <div className="reasoning-track">
            <input
              className="reasoning-range"
              type="range"
              min={0}
              max={reasoning.levels.length - 1}
              step={1}
              value={currentIndex}
              aria-label="Reasoning effort"
              aria-valuetext={REASONING_LABELS[current]}
              aria-describedby={`${panelId}-hint`}
              style={{ "--range-progress": `${currentIndex / Math.max(1, reasoning.levels.length - 1) * 100}%` } as CSSProperties}
              onChange={(event) => onChange(reasoning.levels[Number(event.target.value)])}
            />
            <div className="reasoning-track-ticks" aria-hidden="true" style={{ "--reasoning-stop-count": reasoning.levels.length } as CSSProperties}>
              {reasoning.levels.map((level, index) => (
                <span key={level} className={index === currentIndex ? "is-current" : index < currentIndex ? "is-passed" : ""} />
              ))}
            </div>
          </div>
          <span id={`${panelId}-hint`} className="reasoning-visually-hidden">Use the left and right arrow keys to select a reasoning level. Default: {REASONING_LABELS[reasoning.default]}.</span>
        </div>
      )}
    </div>
  );
}

const KIND_ICONS = { plugin: Server, proxy: Network, mod: Blocks } as const;

function PlatformPicker({ value, onChange, disabled, kinds }: {
  value: PlatformId; onChange: (platform: PlatformId) => void; disabled: boolean; kinds: readonly string[];
}) {
  const CurrentIcon = KIND_ICONS[PLATFORMS[value].kind];
  return (
    <ChipMenu
      label="Loader"
      heading="Loader"
      icon={<CurrentIcon size={14} aria-hidden="true" />}
      display={PLATFORMS[value].label}
      value={value}
      onChange={(next) => { if (isPlatformId(next)) onChange(next); }}
      disabled={disabled}
      groups={PLATFORM_GROUPS.filter((group) => kinds.includes(group.kind)).map((group) => {
        const Icon = KIND_ICONS[group.kind];
        return {
          label: group.label,
          options: group.ids.map((id) => {
            const { label, summary, versions, kind } = PLATFORMS[id];
            return {
              value: id,
              label,
              detail: summary,
              meta: kind === "proxy" ? `API ${versions.at(-1)}–${versions[0]}` : `${versions.at(-1)}–${versions[0]}`,
              icon: <Icon size={15} />,
            };
          }),
        };
      })}
    />
  );
}

/** Lists every Minecraft release so unsupported picks can be explained, not hidden. */
function VersionPicker({ platform, value, onChange, disabled, anyRelease = false }: {
  platform: PlatformId; value: string; onChange: (version: string) => void; disabled: boolean; anyRelease?: boolean;
}) {
  const { kind, label } = PLATFORMS[platform];
  const versions: readonly string[] = anyRelease ? MINECRAFT_RELEASES : PLATFORMS[platform].versions;
  const proxy = kind === "proxy" && !anyRelease;
  const choices = proxy ? versions : MINECRAFT_RELEASES;
  return (
    <ChipMenu
      label={proxy ? `${label} API version` : "Minecraft version"}
      heading={proxy ? `${label} API` : "Minecraft version"}
      icon={<Gamepad2 size={14} aria-hidden="true" />}
      display={value}
      value={value}
      onChange={onChange}
      disabled={disabled}
      compact
      groups={versionLines(choices).map(({ line, versions: group }) => ({
        label: proxy ? `${label} ${line}` : `Minecraft ${line}`,
        options: group.map((version) => {
          const supported = versions.includes(version);
          return {
            value: version,
            label: version,
            muted: !supported,
            meta: !supported ? `Not on ${label}` : anyRelease ? undefined : `Java ${javaVersionFor(platform, version)}`,
          };
        }),
      }))}
    />
  );
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
  testingRestricted = true,
}: {
  value: string;
  onChange: (modelId: string) => void;
  onSetup: () => void;
  choices: Record<string, boolean>;
  disabled: boolean;
  paidAccess: boolean;
  reasoningEffort: ReasoningLevel;
  testingRestricted?: boolean;
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
      model.provider !== "demo" && (!testingRestricted || (TESTING_MODEL_IDS as readonly string[]).includes(model.id)),
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
            <strong>Model</strong>
            <span>Credits per model pass</span>
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
                title={choices[model.id] ? undefined : `Add a ${model.providerLabel} API key on the server to use this model.`}
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
                  ~{estimateCreditsForModel(model.id, 1_500, 5_000, reasoningEffort) ?? "—"} credits / pass before references
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
              <span className="model-group-label">Local preview</span>
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

/** Install steps for resource and shader pack ZIPs. */
function PackGuide({ project }: { project: Project }) {
  if (project.artifactType === "datapack") return (
    <div className="test-instructions">
      <h3>Try your datapack in Minecraft Java {project.version}</h3>
      <ol>
        <li><strong>Use a test world.</strong> Open its folder from the world selection screen, or locate your server&apos;s world folder.</li>
        <li><strong>Open the datapacks folder.</strong> Place the downloaded ZIP directly inside <code>world/datapacks/</code>, without unpacking it.</li>
        <li><strong>Load the pack.</strong> With commands enabled or operator permission, run <code>/reload</code>, then <code>/datapack list enabled</code>.</li>
        <li><strong>Try the mechanic.</strong> Follow README.md for function names and checks. If Minecraft reports an error, inspect the server log before using it in your main world.</li>
      </ol>
      <p>The ZIP is packaged and structurally checked. Commands and gameplay still need an in-game test.</p>
    </div>
  );
  const shader = project.artifactType === "shader_pack";
  const runtime = project.target === "optifine" ? "OptiFine" : "Iris";
  return (
    <div className="test-instructions">
      <h3>Try it in Minecraft {project.version}</h3>
      <ol>
        {shader && <li><strong>Install {runtime} for Minecraft {project.version}.</strong> <a href={runtime === "OptiFine" ? "https://optifine.net/downloads" : "https://irisshaders.dev/"} target="_blank" rel="noreferrer">{runtime} download <ExternalLink size={12} /></a></li>}
        <li><strong>Open the {shader ? "shaderpacks" : "resourcepacks"} folder.</strong> In game, go to {shader ? `Options → Video Settings → ${runtime === "OptiFine" ? "Shaders" : "Shader Packs"}` : "Options → Resource Packs"} and open the pack folder from there.</li>
        <li><strong>Add the ZIP.</strong> Move the downloaded ZIP into that folder without unpacking it.</li>
        <li><strong>Turn it on.</strong> Select the pack in the list, then click Done.</li>
      </ol>
    </div>
  );
}

function TestGuide({ project, target, onTarget }: {
  project: Project;
  target: "local" | "hosted";
  onTarget: (target: "local" | "hosted") => void;
}) {
  if (!isCodeProject(project)) return <PackGuide project={project} />;
  const platform = platformOf(project.target);
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
              <li><strong>Install {platform.label} for Minecraft {project.version}.</strong> {setupLink}</li>
            ) : platform.kind === "proxy" ? (
              <li><strong>Download {platform.label} {project.version}</strong> and run it in front of at least one backend server with forwarding configured. {setupLink}</li>
            ) : (
              <li><strong>Download {platform.label} {project.version}.</strong> {setupLink}</li>
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

type Attachment = { id: string; name: string; type: string; data: string; image: boolean; size: number };
const ATTACHMENT_TYPES = "image/*,.txt,.md,.json,.yml,.yaml,.toml,.properties,.java,.kt,.mcmeta,.mcfunction,.log";

/** Scales an image down to fit the request budget and returns it as a JPEG data URL. */
function downscaleImage(file: File, maxSide = 768, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't read ${file.name}.`));
    };
    image.src = url;
  });
}

async function readAttachment(file: File): Promise<Attachment> {
  const id = crypto.randomUUID();
  if (file.size > (file.type.startsWith("image/") ? 20_000_000 : 160_000)) throw new Error(`${file.name} is too large to read as a reference.`);
  if (file.type.startsWith("image/")) {
    const data = await downscaleImage(file);
    return { id, name: file.name, type: "image/jpeg", data, image: true, size: data.length };
  }
  const text = await file.text();
  if (text.length > 40_000) throw new Error(`${file.name} exceeds the 40,000 character text-file limit.`);
  if (text.includes("\0")) throw new Error(`${file.name} isn't an image or a text file.`);
  return { id, name: file.name, type: "text/plain", data: text, image: false, size: new TextEncoder().encode(text).length };
}

function ReferenceList({ files, busy, onRemove }: { files: Attachment[]; busy: boolean; onRemove: (id: string) => void }) {
  if (!files.length) return null;
  return <section aria-label="Reference attachments">
    <ul className="attachment-list" aria-label="Attachments">
      {files.map(file => <li key={file.id}>
        {file.image ? <span className="attachment-thumb" style={{ backgroundImage: `url(${file.data})` }} aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
        <span className="attachment-name" title={file.name}>{file.name}</span>
        <button type="button" aria-label={`Remove ${file.name}`} disabled={busy} onClick={() => onRemove(file.id)}><X size={13} /></button>
      </li>)}
    </ul>
    <p className="reference-note">Sent to the selected AI for this message. Reattach for later messages. Image processing uses credits.</p>
  </section>;
}

const PROMPT_IDEAS: Record<ContentType | "proxy", readonly string[]> = {
  plugin: [
    "A plugin that gives players a speed boost when they defeat a zombie…",
    "A /heal command with a 60 second cooldown and a heal permission…",
    "A /warps menu that lists every warp as a clickable item…",
  ],
  proxy: ["A proxy plugin with a /lobby command that sends players to the hub…"],
  mod: [
    "A mod that adds a sword which sets mobs on fire…",
    "Add ruby ore, a ruby ingot and a ruby sword stronger than iron…",
    "A backpack item that opens a 27-slot inventory…",
  ],
  shader_pack: ["A shader pack with warm sunsets, soft shadows and waving leaves…"],
  resource_pack: ["A texture pack that makes ores glow and gives tools a clean, flat look…"],
  datapack: ["A datapack that adds a crafting recipe for saddles and a daily login reward…"],
};

/** Types and deletes example prompts in the textarea placeholder while it is empty. */
function useTypedPlaceholder(field: React.RefObject<HTMLTextAreaElement | null>, phrases: readonly string[], active: boolean) {
  useEffect(() => {
    const element = field.current;
    if (!element) return;
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      element.placeholder = phrases[0];
      return;
    }
    let phrase = 0;
    let length = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = phrases[phrase];
      if (!deleting && length === current.length) {
        if (phrases.length === 1) return;
        deleting = true;
        timer = setTimeout(tick, 2600);
        return;
      }
      if (deleting && length === 0) {
        deleting = false;
        phrase = (phrase + 1) % phrases.length;
      }
      length += deleting ? -1 : 1;
      element.placeholder = phrases[phrase].slice(0, length);
      timer = setTimeout(tick, deleting ? 16 : 34);
    };
    element.placeholder = "";
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [field, phrases, active]);
}

const WIDE_LAYOUT = "(min-width: 1200px)";

/** True when chat and code fit side by side; narrower screens switch between them with tabs. */
function useWideLayout() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE_LAYOUT);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

const lineCount = (content: string) => content.split("\n").length;

function ProjectSummary({ project, statusLabel }: { project: Project; statusLabel: string }) {
  const target = isPlatformId(project.target)
    ? `${describeTarget(project.target, project.version)} · Java ${javaVersionFor(project.target, project.version)}`
    : `${projectTargetLabel(project)} for Minecraft ${project.version}`;
  const lines = project.files.reduce((total, file) => total + lineCount(file.content), 0);
  const model = MODEL_OPTIONS.find((option) => option.id === project.modelId)?.label || project.provider;
  return (
    <div className="project-card">
      <div className="project-card-head">
        <span className="project-card-icon" aria-hidden="true"><Blocks size={18} /></span>
        <div>
          <strong>{project.name}</strong>
          <span>{target}</span>
        </div>
        <span className={`status-pill ${project.status}`}>{statusLabel}</span>
      </div>
      <dl className="project-stats">
        <div><dt><FileCode2 size={12} aria-hidden="true" /> Files</dt><dd>{project.files.length}</dd></div>
        <div><dt><AlignLeft size={12} aria-hidden="true" /> Lines</dt><dd>{lines.toLocaleString()}</dd></div>
        <div><dt><Cpu size={12} aria-hidden="true" /> Model</dt><dd title={model}>{model}</dd></div>
      </dl>
    </div>
  );
}

const CHIP_ICONS = {
  reference: FileCode2, config: Settings2, command: Terminal, permission: KeyRound, event: Zap, item: Sword, block: Box,
  entity: Ghost, recipe: Grid3x3, keybind: Keyboard, texture: ImageIcon, shader: Sun, dependency: Package, version: Gamepad2, java: Coffee,
} as const;
type Pane = "code" | "logs" | "test";

/** The model's note after a build. Its commands become file links, copyable chips and buttons. */
function AiReply({ message, project, onOpen, onNext }: {
  message: string;
  project: Project;
  onOpen: (pane: Pane, file?: string) => void;
  onNext: (text: string) => void;
}) {
  const [copied, setCopied] = useState("");
  const findFile = (name: string) =>
    project.files.find((file) => file.path === name)?.path ??
    project.files.find((file) => file.path.endsWith(`/${name}`))?.path;
  const copy = (text: string) => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    });
  };
  const groups: { kind: "text" | "chips" | "actions" | "notes"; items: ReactNode[] }[] = [];
  const add = (kind: (typeof groups)[number]["kind"], item: ReactNode) => {
    const last = groups.at(-1);
    if (last?.kind === kind && kind !== "text") last.items.push(item);
    else groups.push({ kind, items: [item] });
  };
  parseReply(message).forEach((part, index) => {
    if (part.kind === "text") return add("text", <p key={index}>{part.text}</p>);
    const { name, arg } = part;
    if (name === "download")
      return add("actions", (
        <button key={index} type="button" className="reply-action" disabled={!project.artifactAvailable} title={project.artifactAvailable ? undefined : "Nothing to download yet."} onClick={() => { window.location.href = `/api/projects/${project.id}/download`; }}>
          <ArrowDownToLine size={13} /> Download .{isCodeProject(project) ? "jar" : "zip"}
        </button>
      ));
    if (name === "build" || name === "test" || name === "install") {
      const [Icon, label, pane] = name === "build" ? [SquareTerminal, "Build log", "logs" as const] : name === "test" ? [FlaskConical, "Test it", "test" as const] : [PackageOpen, "Install steps", "test" as const];
      return add("actions", <button key={index} type="button" className="reply-action" onClick={() => onOpen(pane)}><Icon size={13} /> {label}</button>);
    }
    if (!arg) return;
    if (name === "warning" || name === "tip")
      return add("notes", <div key={index} className={`reply-note ${name === "warning" ? "is-warning" : ""}`}>{name === "warning" ? <TriangleAlert size={14} /> : <Lightbulb size={14} />}<span>{arg}</span></div>);
    if (name === "next")
      return add("notes", <button key={index} type="button" className="reply-next" onClick={() => onNext(arg)}><CornerDownRight size={14} /><span>{arg}</span></button>);
    const Icon = CHIP_ICONS[name as keyof typeof CHIP_ICONS];
    if (!Icon) return;
    const file = name === "reference" ? findFile(arg) : name === "config" ? findFile("config.yml") : name === "shader" ? findFile("shaders.properties") : undefined;
    const label = name === "reference" ? fileLabel(arg) : name === "config" ? `config.yml · ${arg}` : name === "java" && !/java/i.test(arg) ? `Java ${arg}` : arg;
    if (file)
      return add("chips", <button key={index} type="button" className="reply-chip" title={`Open ${file}`} onClick={() => onOpen("code", file)}><Icon size={13} /><span>{label}</span></button>);
    if (name === "command" || name === "permission")
      return add("chips", <button key={index} type="button" className="reply-chip" title="Copy" onClick={() => copy(arg)}>{copied === arg ? <Check size={13} /> : <Icon size={13} />}<span>{copied === arg ? "Copied" : label}</span></button>);
    add("chips", <span key={index} className="reply-chip" title={name}><Icon size={13} /><span>{label}</span></span>);
  });
  return (
    <div className="ai-reply">
      {groups.map((group, index) =>
        group.kind === "text" ? group.items : <div key={`group-${index}`} className={`reply-${group.kind}`}>{group.items}</div>,
      )}
    </div>
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
  const [signedIn, setSignedIn] = useState(false);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [phase, setPhase] = useState(0);
  const [services, setServices] = useState<{
    generationAvailable: boolean;
    buildConfigured: boolean;
    shaderCompilerConfigured?: boolean;
    message: string;
    choices: Record<string, boolean>;
    preferred: string;
    testingRestricted?: boolean;
    /** Content types the generation API can build; plugins and mods when it doesn't say. */
    artifactTypes?: string[];
  } | null>(null);
  const [billingAccount, setBillingAccount] = useState<BillingAccountView | null>(null);
  const paidAccess = Boolean(billingAccount && billingAccount.plan !== "free" && ["active", "trialing"].includes(billingAccount.subscriptionStatus));
  const generationUnavailable = !services?.choices[selectedModel];
  const wide = useWideLayout();
  // Wide screens always show the conversation, so the right pane falls back to Files.
  const pane = wide && tab === "conversation" ? "code" : tab;
  const versionProblem = CODE_TYPES.includes(contentType) ? incompatibility(platform, version) : null;
  // Datapacks were added in Minecraft 1.13 and resource packs in 1.6.1, so earlier releases can't load them.
  const packProblem = contentType === "datapack" && compareVersions(version, "1.13") < 0
    ? { title: `Datapacks can't be used with Minecraft ${version}.`, reason: "Datapacks were added in Minecraft 1.13." }
    : contentType === "resource_pack" && compareVersions(version, "1.6.1") < 0
      ? { title: `Texture packs can't target Minecraft ${version}.`, reason: "ModHorizon makes resource packs, which replaced the old texture pack format in Minecraft 1.6.1." }
      : null;
  const supportedTypes = services?.artifactTypes ?? CONTENT_TYPES.map((type) => type.id);
  const typeUnavailable = !supportedTypes.includes(contentType);
  const contentLabel = CONTENT_TYPES.find((type) => type.id === contentType)!.label;
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [readingAttachments, setReadingAttachments] = useState(false);
  const [shaderRepairEnabled, setShaderRepairEnabled] = useState(false);
  const [shaderRepairCredits, setShaderRepairCredits] = useState(10);
  const isShaderRequest = (project?.artifactType ?? contentType) === "shader_pack";
  const [referenceQuote, setReferenceQuote] = useState<{ estimatedCredits: number; reservedCredits: number } | null>(null);
  const [referenceQuoteError, setReferenceQuoteError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  // The files, build and test panels are optional; chat-only keeps just the conversation.
  const [showFiles, setShowFiles] = useState(true);
  // The exact same body is used for estimates and submission, including follow-up references.
  const generationBody = JSON.stringify({
    shaderRepairCredits: isShaderRequest && services?.shaderCompilerConfigured && shaderRepairEnabled ? shaderRepairCredits : 0,
    prompt: prompt.trim(), artifactType: project?.artifactType ?? contentType,
    target: project?.target ?? PACK_TARGETS[contentType] ?? platform,
    version: project?.version ?? version, modelId: selectedModel,
    ...(reasoningFor(selectedModel) ? { reasoningEffort: reasoning } : {}),
    ...(attachments.length ? { attachments: attachments.map(({ name, type, data }) => ({ name, type, data })) } : {}),
    ...(project ? { project: { name: project.name, files: project.files } } : {}),
  });
  useEffect(() => {
    setReferenceQuote(null);
    setReferenceQuoteError("");
    if ((!attachments.length && !isShaderRequest) || !signedIn || prompt.trim().length < 12 || busy) return;
    if (new TextEncoder().encode(generationBody).length > 200_000) {
      setReferenceQuoteError("This message and its references exceed 200 KB. Remove a file or use a smaller image.");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/generate/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: generationBody, signal: controller.signal })
        .then(async response => { const result = await response.json(); if (!response.ok || !result.quote) throw new Error(result.error || "Credit estimate unavailable."); return result.quote; })
        .then(quote => { if (!controller.signal.aborted) setReferenceQuote(quote); })
        .catch(error => { if (!controller.signal.aborted) setReferenceQuoteError(error instanceof Error ? error.message : "Credit estimate unavailable."); });
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [generationBody, attachments.length, isShaderRequest, signedIn, prompt, busy]);
  const referenceEstimate = attachments.length > 0 || isShaderRequest ? <p className="reference-note" role="status">{referenceQuoteError || (referenceQuote ? `Estimated ${referenceQuote.estimatedCredits} credits; reserves ${referenceQuote.reservedCredits} for this pass. Unused reserved credits are returned.` : prompt.trim().length >= 12 && signedIn ? "Estimating credits including references…" : "Add your prompt and sign in to see a credit estimate including references.")}</p> : null;

  const shaderCompilerOptions = isShaderRequest ? <div className="reference-note shader-compiler-options">
    <p>{services?.shaderCompilerConfigured ? "Local GLSL compilation runs before download. In-game appearance still needs testing." : "Static shader checks only. A local compiler is not configured."}</p>
    {services?.shaderCompilerConfigured && <>
      <label><input type="checkbox" checked={shaderRepairEnabled} disabled={busy} onChange={event => setShaderRepairEnabled(event.target.checked)} /> Allow one paid compiler repair if needed</label>
      {shaderRepairEnabled && <label> Extra credit limit: <input aria-label="Shader repair credit limit" type="number" style={{ width: "5rem" }} min="1" max="1000" value={shaderRepairCredits} disabled={busy} onChange={event => setShaderRepairCredits(Math.max(1, Math.min(1000, Number(event.target.value) || 1)))} /></label>}
      <p>{shaderRepairEnabled ? `One optional repair may reserve up to ${shaderRepairCredits} extra credits. It is skipped if its required hold exceeds this limit or your balance; unused credits are returned.` : "No paid repair will run unless you enable it."}</p>
    </>}
  </div> : null;

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
    try {
      if (localStorage.getItem("modhorizon-show-files") === "false") setShowFiles(false);
    } catch {
      // Without storage the files panel simply starts open.
    }
  }, []);
  function toggleFiles() {
    const next = !showFiles;
    setShowFiles(next);
    if (!next) setTab("conversation");
    try {
      localStorage.setItem("modhorizon-show-files", String(next));
    } catch {
      // The choice still applies for this visit.
    }
  }
  function openPane(next: Pane, file?: string) {
    setShowFiles(true);
    setTab(next);
    if (file) setSelectedFile(file);
  }
  function suggest(text: string) {
    setPrompt(text);
    setTimeout(() => document.getElementById("followup")?.focus(), 0);
  }

  useEffect(() => {
    const options = reasoningFor(selectedModel);
    if (options) setReasoning(defaultReasoningForArtifact(selectedModel, project?.artifactType ?? contentType));
  }, [selectedModel]);

  useEffect(() => {
    // Landing-page links prefill the composer with ?prompt=, ?platform= and ?version=.
    const query = new URLSearchParams(window.location.search);
    const shared = query.get("prompt");
    const sharedPlatform = query.get("platform");
    const sharedVersion = query.get("version");
    const sharedType = query.get("type");
    if (shared) setPrompt(shared.slice(0, 4000));
    if (isPlatformId(sharedPlatform)) {
      choosePlatform(sharedPlatform);
      if (sharedVersion && PLATFORMS[sharedPlatform].versions.includes(sharedVersion)) setVersion(sharedVersion);
    }
    const type = CONTENT_TYPES.find((entry) => entry.id === sharedType);
    if (type) chooseContentType(type.id);
    if (type && !CODE_TYPES.includes(type.id) && sharedVersion && MINECRAFT_RELEASES.includes(sharedVersion as (typeof MINECRAFT_RELEASES)[number])) setVersion(sharedVersion);
    if (shared || sharedPlatform || type) window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => setSignedIn(Boolean(data?.user)))
      .catch(() => setSignedIn(false));
    return () => controller.abort();
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
            .map((p: Project & { platform?: string }) => {
              // Projects saved before packs were added only stored a platform.
              const target = p.target ?? (isPlatformId(p.platform) ? p.platform : DEFAULT_PLATFORM);
              const artifactType = p.artifactType ?? (isPlatformId(target) && PLATFORMS[target].kind === "mod" ? "mod" : "plugin");
              return { ...p, target, artifactType, artifactAvailable: false };
            }),
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
    setReasoning(defaultReasoningForArtifact(selectedModel, next));
    if (next === "plugin" && PLATFORMS[platform].kind === "mod") choosePlatform("paper");
    else if (next === "mod" && PLATFORMS[platform].kind !== "mod") choosePlatform("fabric");
    if (!CODE_TYPES.includes(next) && !MINECRAFT_RELEASES.includes(version as (typeof MINECRAFT_RELEASES)[number])) setVersion("1.21.4");
    setContentType(next);
  }
  const ideaKey: ContentType | "proxy" = contentType === "plugin" && PLATFORMS[platform].kind === "proxy" ? "proxy" : contentType;
  useTypedPlaceholder(input, PROMPT_IDEAS[ideaKey], !project && !prompt && !busy);

  async function addAttachments(files: FileList | null) {
    if (!files?.length || busy || readingAttachments) return;
    if (files.length + attachments.length > MAX_ATTACHMENTS) { setError(`Attach at most ${MAX_ATTACHMENTS} reference files.`); return; }
    setReadingAttachments(true);
    setError("");
    const added: Attachment[] = [];
    let used = attachments.reduce((total, item) => total + item.size, 0);
    for (const file of Array.from(files).slice(0, MAX_ATTACHMENTS - attachments.length)) {
      try {
        const attachment = await readAttachment(file);
        validateAttachments([{ name: attachment.name, type: attachment.type, data: attachment.data }]);
        if (used + attachment.size > ATTACHMENT_BUDGET) {
          setError(`${file.name} is too large to attach.`);
          continue;
        }
        used += attachment.size;
        added.push(attachment);
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : `Couldn't read ${file.name}.`);
      }
    }
    setAttachments((current) => [...current, ...added]);
    setReadingAttachments(false);
  }
  function newProject() {
    setAttachments([]);
    setProject(null);
    setPrompt("");
    setMessages([]);
    setError("");
    setMobileNav(false);
    setTimeout(() => input.current?.focus(), 0);
  }
  function openProject(p: Project) {
    setAttachments([]);
    setProject(p);
    setContentType(p.artifactType);
    if (isPlatformId(p.target)) setPlatform(p.target);
    setVersion(p.version);
    if (p.modelId && MODEL_OPTIONS.some((model) => model.id === p.modelId))
      setSelectedModel(p.modelId);
    if (p.reasoningEffort) setReasoning(p.reasoningEffort);
    setMessages([
      { role: "user", text: p.prompt },
      {
        role: "assistant",
        reply: p.error ? undefined : p.message,
        text:
          p.error ||
          (p.status === "success"
            ? `Done. The ${isCodeProject(p) ? "JAR" : "ZIP"} is ready to download.`
            : "Done. It isn't compiled yet."),
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
    if (busy || readingAttachments || generationUnavailable || prompt.trim().length < 12 || (!current && (versionProblem || packProblem || typeUnavailable))) return;
    if (!signedIn) {
      window.location.assign("/account");
      return;
    }
    const text = prompt.trim();
    if (current) setTab("conversation");
    setBusy(true);
    setError("");
    try {
      if (new TextEncoder().encode(generationBody).length > 200_000)
        throw new Error("This message and its references exceed 200 KB. Remove a file or use a smaller image.");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: generationBody,
      });
      const data = await response.json();
      if (!response.ok || !data.project)
        throw new Error(data.error || "Something went wrong. Try again.");
      const next: Project = data.project;
      fetch("/api/billing/account", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => { if (data?.account) setBillingAccount(data.account); }).catch(() => undefined);
      if (current && next.status === "failed") {
        const failure =
          next.error ||
          "That change didn't work.";
        setMessages((previous) => [
          ...previous,
          { role: "user", text },
          {
            role: "assistant",
            text: `${failure} Your last version is unchanged.`,
          },
        ]);
        setError(failure);
        setPrompt("");
        return;
      }
      setProject(next);
      setAttachments([]);
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
          reply: next.error ? undefined : next.message,
          text:
            next.error ||
            (next.status === "success"
              ? `Done. The ${isCodeProject(next) ? "JAR" : "ZIP"} is ready to download.`
              : next.provider === "mock"
                ? "Done. This is the built-in example, so it isn't compiled."
                : "Done. It isn't compiled yet."),
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
  // Plugins and mods download as JARs, packs as ZIPs.
  const artifactName = project && !isCodeProject(project) ? "ZIP" : "JAR";
  const statusLabel =
    project?.status === "success"
      ? artifactName === "ZIP" ? "Packaged" : "Build passed"
      : project?.status === "failed"
        ? "Build failed"
        : "Source preview";

  return (
    <div className={`app-shell ${project ? "" : "is-home"}`}>
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
              <span>No projects yet.</span>
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
            <span>Plans &amp; credits</span>
          </Link>
          <Link className="account" href="/account" aria-label="Account and credits">
            <div className="avatar">{signedIn ? (billingAccount?.email || "Y").slice(0, 1).toUpperCase() : "D"}</div>
            <div><strong>{signedIn ? billingAccount?.email || "Your account" : "Sign in / Account"}</strong><span>{billingAccount ? `${billingAccount.plan[0].toUpperCase()}${billingAccount.plan.slice(1)} · ${billingAccount.credits} credits` : "Account and credits"}</span></div>
          </Link>
        </div>
      </aside>

      <main className="main">
        <VoidBackdrop planet={!project} />
        <header className="topbar">
          {!project ? (
            <>
              <div className="home-brand">
                <button
                  type="button"
                  className="sidebar-toggle"
                  aria-label="Show projects"
                  title="Projects"
                  aria-controls="workspace-sidebar"
                  aria-expanded={mobileNav}
                  onClick={() => setMobileNav(true)}
                >
                  <PanelLeftOpen size={17} />
                </button>
                <Logo />
              </div>
              <nav className="home-nav" aria-label="Primary">
                <Link href="/" className="home-nav-link"><House size={15} aria-hidden="true" /> Home</Link>
                <button type="button" className="home-nav-link" onClick={() => setModal("guide")}><CircleHelp size={15} aria-hidden="true" /> Help</button>
              </nav>
              <div className="topbar-right">
                {!signedIn && (
                  <Link className="signin-button" href="/account">
                    Sign in <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </>
          ) : (
          <>
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
            <span>{project?.name || "New project"}</span>
            {project && <span className="tag paper-tag">{projectTargetLabel(project)}</span>}
          </div>
          <div className="topbar-right">
            {project && (
              <button type="button" className="files-toggle" aria-pressed={showFiles} onClick={toggleFiles}>
                {showFiles ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                {showFiles ? "Chat only" : "Show files"}
              </button>
            )}
            <button
              className="icon-button"
              aria-label="Open help"
              onClick={() => setModal("guide")}
            >
              <CircleHelp size={17} />
            </button>

          </div>
          </>
          )}
        </header>

        {!project ? (
          <div className="welcome-scroll">
            <div className="welcome">
              <div className="workspace-home-heading">
                <h1>What will you create?</h1>
              </div>
              <form
                className="composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  void generate();
                }}
              >
                <ReferenceList files={attachments} busy={busy} onRemove={id => setAttachments(current => current.filter(file => file.id !== id))} />
                {referenceEstimate}
                {shaderCompilerOptions}
                <textarea
                  ref={input}
                  aria-label={`Describe your Minecraft ${contentLabel.toLowerCase()}`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={4000}
                  placeholder={PROMPT_IDEAS[ideaKey][0]}
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
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      hidden
                      accept={ATTACHMENT_TYPES}
                      onChange={(event) => {
                        void addAttachments(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      className="composer-attach"
                      aria-label="Add files or images"
                      title="Add files or images"
                      disabled={busy || readingAttachments || attachments.length >= MAX_ATTACHMENTS}
                      onClick={() => fileInput.current?.click()}
                    >
                      <Plus size={18} />
                    </button>
                    <ContentTypePicker value={contentType} onChange={chooseContentType} disabled={busy} />
                    {CODE_TYPES.includes(contentType) ? (
                      <PlatformPicker
                        value={platform}
                        onChange={choosePlatform}
                        disabled={busy}
                        kinds={contentType === "mod" ? ["mod"] : ["plugin", "proxy"]}
                      />
                    ) : (
                      <span className="chip-static"><Layers size={14} aria-hidden="true" /> {CONTENT_TYPES.find((type) => type.id === contentType)!.loaders}</span>
                    )}
                    <VersionPicker
                      platform={platform}
                      value={version}
                      onChange={setVersion}
                      disabled={busy}
                      anyRelease={!CODE_TYPES.includes(contentType)}
                    />
                    <ModelPicker
                      value={selectedModel}
                      onChange={setSelectedModel}
                      onSetup={() => setModal("settings")}
                      choices={services?.choices || {}}
                      testingRestricted={services?.testingRestricted ?? true}
                      disabled={busy}
                      paidAccess={paidAccess}
                      reasoningEffort={reasoning}
                    />
                    <ReasoningPicker modelId={selectedModel} value={reasoning} onChange={setReasoning} disabled={busy} />
                  </div>
                  <button
                    type="submit"
                    className="composer-send"
                    aria-label={busy ? "Generating" : "Generate"}
                    disabled={busy || readingAttachments || generationUnavailable || typeUnavailable || Boolean(versionProblem || packProblem) || prompt.trim().length < 12}
                    title={typeUnavailable ? `${contentLabel} generation isn't available yet.` : versionProblem ? versionProblem.title : packProblem ? packProblem.title : generationUnavailable ? "Add an AI provider key on the server to generate." : "Generate"}
                  >
                    {busy ? <LoaderCircle size={18} className="spin" /> : <ArrowUp size={18} />}
                  </button>
                </div>
              </form>
              {typeUnavailable ? (
                <div className="compat-notice" role="status">
                  <div className="compat-head">
                    <TriangleAlert size={15} aria-hidden="true" />
                    <strong>{contentLabel} generation isn&apos;t available yet.</strong>
                  </div>
                  <div className="compat-actions">
                    <button type="button" onClick={() => chooseContentType("plugin")}>Make a plugin</button>
                    <button type="button" onClick={() => chooseContentType("mod")}>Make a mod</button>
                  </div>
                </div>
              ) : CODE_TYPES.includes(contentType) ? (
                <CompatibilityNotice
                  key={`${platform}-${version}`}
                  platform={platform}
                  version={version}
                  onVersion={setVersion}
                  onPlatform={choosePlatform}
                />
              ) : packProblem ? (
                <div className="compat-notice" role="alert">
                  <div className="compat-head">
                    <TriangleAlert size={15} aria-hidden="true" />
                    <strong>{packProblem.title}</strong>
                  </div>
                  <p>{packProblem.reason}</p>
                  <div className="compat-actions">
                    <button type="button" onClick={() => setVersion("1.13")}>Use 1.13</button>
                  </div>
                </div>
              ) : null}
              {busy && (
                <div className="generation-progress" role="status">
                  <LoaderCircle size={14} className="spin" />
                  {
                    [
                      "Reading your prompt…",
                      "Writing the code…",
                      "Still working…",
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
            </div>
          </div>
        ) : (
          <div className={`project-workspace view-${tab}${showFiles ? "" : " chat-only"}`}>
              <div className="code-toolbar">
                <div className="workspace-tabs" role="tablist" aria-label="Project views" onKeyDown={(event) => {
                  const views = wide ? (["code", "logs", "test"] as const) : (["conversation", "code", "logs", "test"] as const);
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const current = (views as readonly string[]).indexOf(pane);
                  const index = event.key === "Home" ? 0 : event.key === "End" ? views.length - 1 : (current + (event.key === "ArrowRight" ? 1 : views.length - 1)) % views.length;
                  setTab(views[index]);
                  document.getElementById(`tab-${views[index]}`)?.focus();
                }}>
                  {!wide && <button role="tab" id="tab-conversation" aria-controls="panel-conversation" aria-selected={tab === "conversation"} tabIndex={tab === "conversation" ? 0 : -1} className={tab === "conversation" ? "tab-active" : ""} onClick={() => setTab("conversation")}><MessageSquare size={15} /> Conversation</button>}
                  <button
                    role="tab" id="tab-code" aria-controls="panel-code" aria-selected={pane === "code"} tabIndex={pane === "code" ? 0 : -1} className={pane === "code" ? "tab-active" : ""}
                    onClick={() => setTab("code")}
                  >
                    <Code2 size={15} />
                    Files
                  </button>
                  <button
                    role="tab" id="tab-logs" aria-controls="panel-logs" aria-selected={pane === "logs"} tabIndex={pane === "logs" ? 0 : -1} className={pane === "logs" ? "tab-active" : ""}
                    onClick={() => setTab("logs")}
                  >
                    <SquareTerminal size={15} />
                    Build
                  </button>
                <button
                  role="tab" id="tab-test" aria-controls="panel-test" aria-selected={pane === "test"} tabIndex={pane === "test" ? 0 : -1} className={pane === "test" ? "tab-active" : ""}
                  onClick={() => setTab("test")}
                >
                  <FlaskConical size={15} />
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
                        : `Download the ${artifactName}`
                    }
                    onClick={() => {
                      window.location.href = `/api/projects/${project.id}/download`;
                    }}
                  >
                    <ArrowDownToLine size={14} />
                    <span>Download .{artifactName.toLowerCase()}</span>
                  </Button>
                </div>
              </div>
            <section className="chat-panel" id="panel-conversation" {...(wide ? { "aria-label": "Conversation" } : { role: "tabpanel", "aria-labelledby": "tab-conversation" })} hidden={showFiles && !wide && tab !== "conversation"}>
              <ProjectSummary project={project} statusLabel={statusLabel} />
              <ShaderFeatureReport project={project} />
              <div className="chat-messages">
                {messages.map((message, i) => (
                  <div key={i} className={`message message-${message.role}`}>
                    <div className="message-avatar">
                      {message.role === "assistant" ? (
                        <BrandMark size={14} />
                      ) : (
                        "D"
                      )}
                    </div>
                    <div>
                      <strong>
                        {message.role === "assistant" ? "ModHorizon" : "You"}
                      </strong>
                      {message.reply && <AiReply message={message.reply} project={project} onOpen={openPane} onNext={suggest} />}
                      <p className={message.reply ? "message-status" : undefined}>{message.text}</p>
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="chat-wait" role="status">
                    <LoaderCircle size={15} className="spin" />
                    {
                      [
                        "Reading your change…",
                        "Writing the code…",
                        "Still working…",
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
                <ReferenceList files={attachments} busy={busy} onRemove={id => setAttachments(current => current.filter(file => file.id !== id))} />
                {referenceEstimate}
                {shaderCompilerOptions}
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
                  aria-label="Describe a change"
                />
                <div>
                  <div className="followup-pickers">
                    <input ref={fileInput} type="file" multiple hidden accept={ATTACHMENT_TYPES} onChange={event => { void addAttachments(event.target.files); event.target.value = ""; }} />
                    <button type="button" className="composer-attach" aria-label="Add files or images" title="Add files or images" disabled={busy || readingAttachments || attachments.length >= MAX_ATTACHMENTS} onClick={() => fileInput.current?.click()}><Plus size={18} /></button>
                    <ModelPicker
                      value={selectedModel}
                      onChange={setSelectedModel}
                      onSetup={() => setModal("settings")}
                      choices={services?.choices || {}}
                      testingRestricted={services?.testingRestricted ?? true}
                      disabled={busy}
                      paidAccess={paidAccess}
                      reasoningEffort={reasoning}
                    />
                    <ReasoningPicker modelId={selectedModel} value={reasoning} onChange={setReasoning} disabled={busy} />
                  </div>
                  <Button
                    size="icon"
                    aria-label="Send follow-up"
                    disabled={busy || readingAttachments || generationUnavailable || prompt.trim().length < 12}
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
            <section className="code-panel" id={`panel-${pane === "test" ? "test" : pane === "logs" ? "logs" : "code"}`} role="tabpanel" aria-labelledby={`tab-${pane === "test" ? "test" : pane === "logs" ? "logs" : "code"}`} hidden={!wide && tab === "conversation"}>
              {pane === "test" ? (
                <div className="test-workflow">
                  <div className="test-workflow-heading">
                    <div>
                      <h2>Test it</h2>
                    </div>
                    {project.artifactAvailable && (
                      <Button size="sm" onClick={() => { window.location.href = `/api/projects/${project.id}/download`; }}>
                        <ArrowDownToLine size={14} /> Download .{artifactName.toLowerCase()}
                      </Button>
                    )}
                  </div>
                  <ol className="test-steps" aria-label="Testing progress">
                    <li className={project.files.length ? "test-step-done" : "test-step-current"}><span>1</span><div><strong>Describe and generate</strong><small>{project.files.length ? "Source files are ready." : "No source files came back. Try again."}</small></div>{project.files.length ? <Check size={15} /> : <span className="step-state">Review</span>}</li>
                    <li className={project.artifactAvailable ? "test-step-done" : project.files.length ? "test-step-current" : "test-step-locked"}><span>2</span><div><strong>{artifactName === "ZIP" ? "Package" : "Compile"}</strong><small>{project.artifactAvailable ? `${artifactName} ready.` : project.files.length ? project.status === "failed" ? "The build failed. See the build log." : project.status === "success" ? "Expired. Send a change to make it again." : "Needs a build service." : "After generation."}</small></div>{project.artifactAvailable ? <Check size={15} /> : <span className="step-state">{project.status === "failed" && project.files.length ? "Review" : "Waiting"}</span>}</li>
                    <li className={project.artifactAvailable ? "test-step-current" : "test-step-locked"}><span>3</span><div><strong>Install and play</strong><small>{project.artifactAvailable ? isPlatformId(project.target) ? `Install it on ${describeTarget(project.target, project.version)}.` : `Add it to Minecraft ${project.version}.` : `After the ${artifactName} is ready.`}</small></div>{project.artifactAvailable ? <span className="step-state">Next</span> : <span className="step-state">Locked</span>}</li>
                  </ol>
                  {!project.artifactAvailable && (
                    <div className="test-blocker" role="status">
                      <strong>{project.status === "failed" ? project.files.length ? "The build failed" : "Generation failed" : project.status === "success" ? "Download expired" : `No ${artifactName} yet`}</strong>
                      <p>{project.status === "failed" ? project.files.length ? "See the build log for the errors." : project.error || "Try generating it again." : project.status === "success" ? `The ${artifactName} is only kept while the server is running. Send a change to make it again.` : "No build service is connected, so there's nothing to install yet."}</p>
                      <button type="button" onClick={() => setTab(project.status === "failed" && project.files.length ? "logs" : project.files.length ? "code" : "conversation")}>{project.status === "failed" && project.files.length ? "Build log" : project.files.length ? "Source" : "Conversation"}<ArrowRight size={14} /></button>
                    </div>
                  )}
                  <TestGuide project={project} target={testTarget} onTarget={setTestTarget} />
                  <p className="test-safety"><ShieldCheck size={14} /> Test on a private {isPlatformId(project.target) && PLATFORMS[project.target].kind !== "mod" ? "server" : "world"} before going live.</p>
                </div>
              ) : pane === "logs" ? (
                <div className="build-logs">
                  <div className="logs-title">
                    <SquareTerminal size={17} />
                    <span>Build log</span>
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
                          <p>Pick a file.</p>
                        </div>
                      )}
                    </div>
                    <div className="editor-status">
                      <span>{currentFile?.path || "No files"}</span>
                      <span>{currentFile?.path.endsWith(".java") ? "Java" : "Text"}</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        {storageError && (
          <div className="storage-notice" role="status">
            Projects can&apos;t be saved in this browser, so they&apos;ll be gone when you close the tab.
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
            ? "How it works"
            : "Settings"}
        </h2>
        {modal === "guide" ? (
          <>
            <p>Describe one mechanic at a time: what triggers it, what happens and for how long.</p>
            <ol className="guide-steps">
              <li>
                <strong>Describe it</strong>
                <span>Pick a creation type and Minecraft version. Plugins and mods also need a loader.</span>
              </li>
              <li>
                <strong>Read the source</strong>
                <span>Check the files and the build log.</span>
              </li>
              <li>
                <strong>Build and test</strong>
                <span>Download a pack ZIP, or build a plugin/mod JAR with a connected build service. Try it in a test world.</span>
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
            <a className="docs-link" href="/#examples">Browse example prompts <ArrowRight size={13} /></a>
            <a className="docs-link" href={`/api/examples/datapack?version=${dataPackFormat(version) ? version : "1.21.4"}`} download>Download a sample datapack <ArrowDownToLine size={13} /></a>
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
            <p>API keys are set on the server, never in the browser.</p>
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
              See <code>.env.example</code> and the README. Restart the server after changing them.
            </p>
            <div className="settings-row">
              <div>
                <strong>Project history</strong>
                <span>Saved in this browser.</span>
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
              <ShieldCheck size={15} /> <Link href="/account">Manage your account and sign-in options</Link>.
            </p>
          </>
        )}
      </dialog>
    </div>
  );
}
