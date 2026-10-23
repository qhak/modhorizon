import type { ArtifactTarget, ArtifactType, GenerateRequest, GeneratedProject, ReasoningEffort } from "./types";
import {
  DEFAULT_PLATFORM,
  MINECRAFT_RELEASES,
  PLATFORMS,
  PLATFORM_IDS,
  compareVersions,
  incompatibility,
  isPlatformId,
  type PlatformId,
} from "./platforms";
import { DEFAULT_MODEL_ID, findModel, reasoningFor, DEFAULT_REASONING_EFFORT, REASONING_EFFORTS } from "./models";
import { ARTIFACT_EXPERTS } from "./artifact-experts";
import { validateAttachments } from "./reference-attachments";
import { readShaderReport, stripShaderComments } from "./shader-report";
import { maskShaderComments, normalizeShaderMatrices } from "./shader-normalization";
import { checkShaderSourceContracts } from "./shader-source-checks";

export const MAX_REQUEST_BYTES = 200_000;
const MAX_SOURCE_BYTES = 150_000;
const MAX_FILE_COUNT = 30;
const MAX_FILE_CHARS = 40_000;
export class InputError extends Error {}

const SOURCE_PATH =
  /^src\/main\/java\/(?:[A-Za-z_][A-Za-z0-9_]*\/)*[A-Za-z_][A-Za-z0-9_]*\.java$/;
const RESOURCE_PATH =
  /^src\/main\/resources\/(?:plugin\.yml|config\.yml|bungee\.yml|velocity-plugin\.json|fabric\.mod\.json|quilt\.mod\.json|mcmod\.info|pack\.mcmeta|META-INF\/(?:mods|neoforge\.mods)\.toml|META-INF\/sponge_plugins\.json|[a-z0-9_]+\.mixins\.json|assets\/[a-z0-9_.-]+\/lang\/[a-z]{2}_[a-z]{2}\.json)$/;
const CLASS_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/;
const RESOURCES = "src/main/resources/";

type Files = GeneratedProject["files"];

function allowedPath(path: string, kind: ArtifactType): boolean {
  if (kind === "plugin")
    return SOURCE_PATH.test(path) || RESOURCE_PATH.test(path);
  if (kind === "mod")
    return SOURCE_PATH.test(path) || RESOURCE_PATH.test(path) || path === "README.md";
  if (kind === "resource_pack")
    return path === "pack.mcmeta" || path === "README.md" || /^assets\/[a-z0-9_.-]+\/[A-Za-z0-9_./-]+\.(json|mcmeta|properties)$/.test(path);
  return path === "shader-plan.json" || path === "shaders.properties" || path === "README.md" || /^shaders\/[A-Za-z0-9_./-]+\.(vsh|fsh|glsl|properties)$/.test(path);
}

/** Platforms a request may target for each artifact type. */
function targetsFor(kind: ArtifactType): readonly ArtifactTarget[] {
  if (kind === "plugin") return PLATFORM_IDS.filter((id) => PLATFORMS[id].kind !== "mod");
  if (kind === "mod") return PLATFORM_IDS.filter((id) => PLATFORMS[id].kind === "mod");
  return ARTIFACT_EXPERTS[kind].targets;
}

function resource(files: Files, name: string) {
  return files.find((file) => file.path === RESOURCES + name)?.content;
}

function yamlValue(descriptor: string, key: string) {
  const match = descriptor.match(new RegExp(`^${key}:\\s*["']?([^\\r\\n"']+)["']?\\s*$`, "m"));
  return match?.[1]?.trim();
}

function json(descriptor: string, name: string): unknown {
  try {
    return JSON.parse(descriptor);
  } catch {
    throw new InputError(`${name} must be valid JSON.`);
  }
}

/** Checks that a declared main or entrypoint class is included and in the right package. */
function requireClass(files: Files, className: unknown, descriptor: string) {
  const name = typeof className === "string" ? className.split("::")[0] : "";
  if (!CLASS_NAME.test(name))
    throw new InputError(`${descriptor} needs a fully qualified main class.`);
  const file = files.find((entry) => entry.path === `src/main/java/${name.replace(/\./g, "/")}.java`);
  if (!file)
    throw new InputError(`${descriptor} main must point to an included Java source file.`);
  const packageName = name.split(".").slice(0, -1).join(".");
  if (!new RegExp(`^\\s*package\\s+${packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*;`, "m").test(file.content))
    throw new InputError(`The Java package must match ${descriptor} main.`);
}

function entrypointClasses(entrypoints: unknown): unknown[] {
  if (!entrypoints || typeof entrypoints !== "object") return [];
  return Object.values(entrypoints).flatMap((list) =>
    (Array.isArray(list) ? list : [list]).map((entry) =>
      entry && typeof entry === "object" ? (entry as { value?: unknown }).value : entry,
    ),
  );
}

function requireModAnnotation(files: Files, modId: string, descriptor: string) {
  if (!files.some((file) => new RegExp(`@Mod\\s*\\(\\s*(?:value\\s*=\\s*|modid\\s*=\\s*)?["']?${modId}\\b|@Mod\\s*\\(\\s*[A-Za-z_.]*MOD_?ID`).test(file.content)))
    throw new InputError(`Include a class annotated with @Mod for the ${descriptor} modId "${modId}".`);
}

function validateDescriptor(files: Files, platform: PlatformId, version: string) {
  const { family, label } = PLATFORMS[platform];
  const missing = (name: string) =>
    new InputError(`A ${label} project needs Java source and src/main/resources/${name}.`);

  if (family === "bukkit") {
    const descriptor = resource(files, "plugin.yml");
    if (!descriptor) throw missing("plugin.yml");
    if (!yamlValue(descriptor, "name"))
      throw new InputError("plugin.yml needs a valid name and fully qualified main class.");
    requireClass(files, yamlValue(descriptor, "main"), "plugin.yml");
    const apiVersion = yamlValue(descriptor, "api-version");
    // api-version was introduced in 1.13; older servers ignore it.
    if (compareVersions(version, "1.13") >= 0 && (!apiVersion || !/^\d+\.\d+(?:\.\d+)?$/.test(apiVersion)))
      throw new InputError(`plugin.yml needs a valid api-version such as ${version.split(".").slice(0, 2).join(".")}.`);
    if (platform === "folia" && yamlValue(descriptor, "folia-supported") !== "true")
      throw new InputError("Folia plugins must set folia-supported: true in plugin.yml.");
    return;
  }
  if (family === "bungeecord") {
    const descriptor = resource(files, "bungee.yml");
    if (!descriptor) throw missing("bungee.yml");
    if (!yamlValue(descriptor, "name")) throw new InputError("bungee.yml needs a name.");
    requireClass(files, yamlValue(descriptor, "main"), "bungee.yml");
    return;
  }
  if (family === "velocity") {
    const descriptor = resource(files, "velocity-plugin.json");
    if (!descriptor) throw missing("velocity-plugin.json");
    const data = json(descriptor, "velocity-plugin.json") as { id?: unknown; main?: unknown };
    if (typeof data.id !== "string" || !/^[a-z][a-z0-9-_]{0,63}$/.test(data.id))
      throw new InputError("velocity-plugin.json needs a lowercase id.");
    requireClass(files, data.main, "velocity-plugin.json");
    return;
  }
  if (family === "fabric") {
    const descriptor = resource(files, "fabric.mod.json");
    if (!descriptor) throw missing("fabric.mod.json");
    const data = json(descriptor, "fabric.mod.json") as { schemaVersion?: unknown; id?: unknown; version?: unknown; entrypoints?: unknown };
    if (data.schemaVersion !== 1 || typeof data.id !== "string" || !/^[a-z][a-z0-9-_]{1,63}$/.test(data.id) || typeof data.version !== "string")
      throw new InputError("fabric.mod.json needs schemaVersion 1, a lowercase id and a version.");
    const classes = entrypointClasses(data.entrypoints);
    if (!classes.length) throw new InputError("fabric.mod.json needs at least one entrypoint.");
    classes.forEach((name) => requireClass(files, name, "fabric.mod.json entrypoint"));
    return;
  }
  if (family === "quilt") {
    const descriptor = resource(files, "quilt.mod.json");
    if (!descriptor) throw missing("quilt.mod.json");
    const data = json(descriptor, "quilt.mod.json") as { quilt_loader?: { id?: unknown; version?: unknown; entrypoints?: unknown } };
    const loader = data.quilt_loader;
    if (typeof loader?.id !== "string" || !/^[a-z][a-z0-9-_]{1,63}$/.test(loader.id) || typeof loader.version !== "string")
      throw new InputError("quilt.mod.json needs quilt_loader.id in lowercase and a version.");
    const classes = entrypointClasses(loader.entrypoints);
    if (!classes.length) throw new InputError("quilt.mod.json needs at least one entrypoint.");
    classes.forEach((name) => requireClass(files, name, "quilt.mod.json entrypoint"));
    return;
  }
  if (family === "forge" || family === "neoforge") {
    const legacyForge = family === "forge" && compareVersions(version, "1.13") < 0;
    if (legacyForge) {
      const descriptor = resource(files, "mcmod.info");
      if (!descriptor) throw missing("mcmod.info");
      const data = json(descriptor, "mcmod.info");
      const modId = Array.isArray(data) ? (data[0] as { modid?: unknown })?.modid : undefined;
      if (typeof modId !== "string" || !modId) throw new InputError("mcmod.info needs a modid.");
      requireModAnnotation(files, modId, "mcmod.info");
      return;
    }
    const name = family === "neoforge" && compareVersions(version, "1.20.5") >= 0 ? "META-INF/neoforge.mods.toml" : "META-INF/mods.toml";
    const descriptor = resource(files, name);
    if (!descriptor) throw missing(name);
    const modId = descriptor.match(/^\s*modId\s*=\s*["']([a-z][a-z0-9_]{1,63})["']/m)?.[1];
    if (!/^\s*modLoader\s*=\s*["'][^"']+["']/m.test(descriptor) || !modId)
      throw new InputError(`${name} needs modLoader and a [[mods]] entry with a lowercase modId.`);
    requireModAnnotation(files, modId, name);
    return;
  }
  // Sponge: API 8 (Minecraft 1.16.5) moved plugin metadata into sponge_plugins.json.
  if (compareVersions(version, "1.16.5") >= 0) {
    const descriptor = resource(files, "META-INF/sponge_plugins.json");
    if (!descriptor) throw missing("META-INF/sponge_plugins.json");
    const data = json(descriptor, "sponge_plugins.json") as { plugins?: { id?: unknown; entrypoint?: unknown }[] };
    const plugin = Array.isArray(data.plugins) ? data.plugins[0] : undefined;
    if (typeof plugin?.id !== "string") throw new InputError("sponge_plugins.json needs a plugin id.");
    requireClass(files, plugin.entrypoint, "sponge_plugins.json entrypoint");
    return;
  }
  if (!files.some((file) => /@Plugin\s*\(/.test(file.content)))
    throw new InputError("Sponge plugins need a main class annotated with @Plugin.");
}

function validateResourcePack(files: Files) {
  const metadata = files.find((file) => file.path === "pack.mcmeta");
  if (!metadata) throw new InputError("Resource packs need a root pack.mcmeta file.");
  let parsed: unknown;
  try { parsed = JSON.parse(metadata.content); }
  catch { throw new InputError("pack.mcmeta must contain valid JSON."); }
  const pack = (parsed as { pack?: Record<string, unknown> } | null)?.pack;
  const description = pack?.description;
  if (!pack || !Number.isInteger(pack.pack_format) || !(typeof description === "string" || (description !== null && typeof description === "object")))
    throw new InputError("pack.mcmeta needs an integer pack.pack_format and a text-component description.");
  if (!files.some((file) => file.path.startsWith("assets/")))
    throw new InputError("Add at least one namespaced file under assets/<namespace>/.");
  for (const file of files.filter((item) => item.path.endsWith(".json") || item.path.endsWith(".mcmeta"))) {
    try { JSON.parse(file.content); }
    catch { throw new InputError(`${file.path} must contain valid JSON.`); }
  }
}

function validateShaderPack(files: Files) {
  if (files.some((file) => file.path === "shaders.properties"))
    throw new InputError("Move shader settings to shaders/shaders.properties, not the ZIP root.");
  const entries = files.filter((file) => /\.(vsh|fsh)$/.test(file.path));
  const paths = new Set(files.map((file) => file.path));
  // Product baseline policy: runtime fallback alone was insufficient in Test 002.
  for (const program of ["gbuffers_terrain", "gbuffers_clouds"])
    for (const stage of ["vsh", "fsh"])
      if (!paths.has(`shaders/${program}.${stage}`))
        throw new InputError(`Shader packs need shaders/${program}.${stage} for explicit terrain and vanilla-cloud coverage; composite-only output is incomplete.`);
  const gbuffers = "basic|line|textured|textured_lit|skybasic|skytextured|clouds|terrain|terrain_solid|terrain_cutout|damagedblock|block|block_translucent|beaconbeam|entities|entities_glowing|entities_translucent|item|armor_glint|spidereyes|hand|hand_water|weather|water|particles|particles_translucent|lightning";
  const programPath = new RegExp(`^shaders/(?:world(?:-1|0|1)/)?(?:gbuffers_(?:${gbuffers})|shadow|(?:composite|deferred|shadowcomp|prepare|begin)\\d*|final)\\.(vsh|fsh)$`);
  for (const file of entries) {
    if (!programPath.test(file.path))
      throw new InputError(`Unrecognised shader program ${file.path}; use runtime program names such as gbuffers_terrain, composite or final.`);
    const sibling = file.path.replace(/\.(vsh|fsh)$/, file.path.endsWith(".vsh") ? ".fsh" : ".vsh");
    if (!paths.has(sibling)) throw new InputError(`Shader program ${file.path} is missing its paired stage ${sibling}.`);
    const code = file.content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    if (!/^\s*#version\s+\d+\b/.test(code))
      throw new InputError(`${file.path} needs its own leading GLSL #version directive.`);
    if (!/\bvoid\s+main\s*\(\s*(?:void\s*)?\)/.test(code))
      throw new InputError(`${file.path} needs a main() entrypoint.`);
  }
  for (const file of files.filter((file) => /\.(vsh|fsh|glsl)$/.test(file.path))) {
    const code = stripShaderComments(file.content);
    const masked = maskShaderComments(file.content);
    const reserved = /\b(?:uniform|attribute|varying)\s+(?:(?:lowp|mediump|highp)\s+)?\w+\s+(gl_\w+)/.exec(masked);
    if (reserved) {
      const line = masked.slice(0, reserved.index).split("\n").length;
      throw new InputError(`${file.path}:${line} redeclares reserved gl_ input ${reserved[1]}. Use an available compatibility built-in without declaring it, or rename a custom input and supply it through the target's supported interface.`);
    }
    if (/^\s*#\s*(?:if|elif)\b[^\n]*(?:\b\d+\.\d*|\.\d+)\b/m.test(code))
      throw new InputError(`${file.path} uses a floating-point preprocessor condition. #if/#elif require integer expressions; use shader arithmetic for float settings.`);
    for (const match of code.matchAll(/^[ \t]*#[ \t]*include[ \t]+"([^"]+)"/gm)) {
      const include = match[1];
      const resolved = include.startsWith("/") ? `shaders${include}` : file.path.slice(0, file.path.lastIndexOf("/") + 1) + include;
      if (include.includes("..") || include.includes("\\") || !paths.has(resolved))
        throw new InputError(`${file.path} includes a missing or unsupported file: ${include}.`);
    }
  }
  try { checkShaderSourceContracts(files); readShaderReport(files); }
  catch (error) { throw new InputError(error instanceof Error ? error.message : "Invalid shader feature report."); }
}

/** Keeps the model's note readable: text only, no control characters, bounded length. */
function cleanMessage(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2000);
  return text || undefined;
}

/** Plugins and mods are checked against the target platform's rules for that version, the newest when omitted. */
export function validateProject(
  value: unknown,
  artifactType: ArtifactType = "plugin",
  target: ArtifactTarget = "paper",
  version?: string,
  options: { allowIncompleteShader?: boolean } = {},
): GeneratedProject {
  if (!value || typeof value !== "object") throw new InputError("The provider did not return a project object.");
  const project = value as Record<string, unknown>;
  if (typeof project.name !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(project.name))
    throw new InputError("Project names must use 1–48 letters, numbers, underscores, or hyphens and start with a letter.");
  if (!Array.isArray(project.files) || project.files.length === 0 || project.files.length > MAX_FILE_COUNT)
    throw new InputError(`A project must contain 1–${MAX_FILE_COUNT} source files.`);
  const code = artifactType === "plugin" || artifactType === "mod";
  const seen = new Set<string>();
  let bytes = 0;
  let files = project.files.map((file: unknown) => {
    if (!file || typeof file !== "object") throw new InputError("Invalid source file.");
    const { path, content } = file as Record<string, unknown>;
    if (typeof path !== "string" || path.length > 200 || path.includes("..") || path.startsWith("/") || path.includes("\\") || !allowedPath(path, artifactType))
      throw new InputError(code
        ? "Only Java sources and recognised plugin or mod descriptors are accepted; build scripts and unsafe paths are blocked."
        : `Unsupported ${artifactType.replace("_", " ")} file path. ${ARTIFACT_EXPERTS[artifactType].sourcePaths}`);
    if (seen.has(path.toLowerCase())) throw new InputError("Duplicate source file path.");
    seen.add(path.toLowerCase());
    if (typeof content !== "string" || content.includes("\0") || content.length > MAX_FILE_CHARS)
      throw new InputError(`Source files must be text and no larger than ${MAX_FILE_CHARS.toLocaleString()} characters.`);
    bytes += new TextEncoder().encode(content).length;
    if (bytes > MAX_SOURCE_BYTES) throw new InputError("Generated project exceeds the 150 KB source limit.");
    return { path, content };
  });

  const repairs: string[] = [];
  if (artifactType === "shader_pack" && !options.allowIncompleteShader) {
    const normalized = normalizeShaderMatrices(files);
    files = normalized.files;
    repairs.push(...normalized.repairs);
  }
  if (artifactType === "resource_pack") validateResourcePack(files);
  else if (artifactType === "shader_pack") {
    if (!options.allowIncompleteShader) validateShaderPack(files);
  }
  else {
    if (!isPlatformId(target)) throw new InputError("Choose a supported platform.");
    if (!files.some((file) => file.path.endsWith(".java")))
      throw new InputError(`A ${PLATFORMS[target].label} project needs Java source.`);
    validateDescriptor(files, target, version ?? PLATFORMS[target].versions[0]);
  }
  const originalMessage = cleanMessage(project.message);
  const message = repairs.length
    ? cleanMessage(`Automatic compatibility cleanup: ${repairs.length} redundant built-in matrix declaration(s) removed. GLSL compilation and appearance remain unverified.\n\n${originalMessage || ""}`)
    : originalMessage;
  return { name: project.name, files, ...(message ? { message } : {}),
    ...(artifactType === "shader_pack" && !options.allowIncompleteShader ? { shaderReport: readShaderReport(files) } : {}) };
}

export function validateRequest(value: unknown): GenerateRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected a JSON object.");
  const data = value as Record<string, unknown>;
  if (typeof data.prompt !== "string" || data.prompt.trim().length < 12 || data.prompt.length > 4000)
    throw new InputError("Describe what to create in 12–4,000 characters.");
  const artifactType = data.artifactType ?? (isPlatformId(data.platform) && PLATFORMS[data.platform].kind === "mod" ? "mod" : "plugin");
  if (typeof artifactType !== "string" || !Object.hasOwn(ARTIFACT_EXPERTS, artifactType)) throw new InputError("Choose plugin, mod, resource_pack, or shader_pack.");
  const kind = artifactType as ArtifactType;
  const targets = targetsFor(kind);
  const target = data.target ?? data.platform ?? (kind === "plugin" ? DEFAULT_PLATFORM : targets.length === 1 ? targets[0] : undefined);
  if (typeof target !== "string" || !targets.includes(target as ArtifactTarget))
    throw new InputError(`Choose a target for this ${ARTIFACT_EXPERTS[kind].label.toLowerCase()}: ${targets.join(", ")}.`);
  if (typeof data.version !== "string") throw new InputError("Choose a Minecraft version.");
  if (isPlatformId(target)) {
    const problem = incompatibility(target, data.version);
    if (problem) throw new InputError(`${problem.title} ${problem.reason}`);
  } else if (!MINECRAFT_RELEASES.includes(data.version as (typeof MINECRAFT_RELEASES)[number]))
    throw new InputError("Choose a supported Minecraft release.");
  // pack.mcmeta arrived with resource packs in 1.6.1; older clients only read texture packs.
  else if (kind === "resource_pack" && compareVersions(data.version, "1.6.1") < 0)
    throw new InputError("Resource packs need Minecraft 1.6.1 or newer.");
  const modelId = data.modelId ?? DEFAULT_MODEL_ID;
  if (typeof modelId !== "string" || !findModel(modelId)) throw new InputError("Choose a supported AI model.");
  const reasoning = reasoningFor(modelId);
  const reasoningEffort = data.reasoningEffort ?? reasoning?.default ?? DEFAULT_REASONING_EFFORT;
  if (typeof reasoningEffort !== "string" || !REASONING_EFFORTS.includes(reasoningEffort as ReasoningEffort))
    throw new InputError("Choose a supported reasoning level.");
  if (reasoning && !reasoning.levels.includes(reasoningEffort as ReasoningEffort))
    throw new InputError("That reasoning level is not supported by the selected model.");
  const shaderRepairCredits = data.shaderRepairCredits ?? 0;
  if (!Number.isInteger(shaderRepairCredits) || (shaderRepairCredits as number) < 0 || (shaderRepairCredits as number) > 1000 || (kind !== "shader_pack" && shaderRepairCredits !== 0))
    throw new InputError("Shader repair budget must be an integer from 0 to 1,000 credits, for shaders only.");
  let attachments: GenerateRequest["attachments"] = undefined;
  try { attachments = data.attachments === undefined ? undefined : validateAttachments(data.attachments); }
  catch (error) { throw new InputError(error instanceof Error ? error.message : "Invalid reference attachments."); }
  if (attachments?.length && modelId === "demo") throw new InputError("Reference attachments need a connected AI model; the local example cannot read them.");
  return {
    shaderRepairCredits: shaderRepairCredits as number,
    ...(attachments?.length ? { attachments } : {}),
    reasoningEffort: reasoningEffort as ReasoningEffort,
    prompt: data.prompt.trim(),
    version: data.version,
    artifactType: kind,
    target: target as ArtifactTarget,
    modelId,
    // Older failed shaders remain editable; all path/size checks still apply.
    ...(data.project === undefined ? {} : { project: validateProject(data.project, kind, target as ArtifactTarget, data.version, { allowIncompleteShader: true }) }),
  };
}
