import type { GenerateRequest, GeneratedProject } from "./types";
import {
  DEFAULT_PLATFORM,
  PLATFORMS,
  compareVersions,
  incompatibility,
  isPlatformId,
  type PlatformId,
} from "./platforms";
import { DEFAULT_MODEL_ID, findModel } from "./models";
import { DEFAULT_REASONING_EFFORT, REASONING_EFFORTS, type ReasoningEffort } from "./models";

export const MAX_REQUEST_BYTES = 200_000;
export class InputError extends Error {}

const SOURCE_PATH =
  /^src\/main\/java\/(?:[A-Za-z_][A-Za-z0-9_]*\/)*[A-Za-z_][A-Za-z0-9_]*\.java$/;
const RESOURCE_PATH =
  /^src\/main\/resources\/(?:plugin\.yml|config\.yml|bungee\.yml|velocity-plugin\.json|fabric\.mod\.json|quilt\.mod\.json|mcmod\.info|pack\.mcmeta|META-INF\/(?:mods|neoforge\.mods)\.toml|META-INF\/sponge_plugins\.json|[a-z0-9_]+\.mixins\.json|assets\/[a-z0-9_.-]+\/lang\/[a-z]{2}_[a-z]{2}\.json)$/;
const CLASS_NAME = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/;
const RESOURCES = "src/main/resources/";

type Files = { path: string; content: string }[];

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
    const data = json(descriptor, "fabric.mod.json") as { schemaVersion?: unknown; id?: unknown; entrypoints?: unknown };
    if (data.schemaVersion !== 1 || typeof data.id !== "string" || !/^[a-z][a-z0-9-_]{1,63}$/.test(data.id))
      throw new InputError("fabric.mod.json needs schemaVersion 1 and a lowercase id.");
    const classes = entrypointClasses(data.entrypoints);
    if (!classes.length) throw new InputError("fabric.mod.json needs at least one entrypoint.");
    classes.forEach((name) => requireClass(files, name, "fabric.mod.json entrypoint"));
    return;
  }
  if (family === "quilt") {
    const descriptor = resource(files, "quilt.mod.json");
    if (!descriptor) throw missing("quilt.mod.json");
    const data = json(descriptor, "quilt.mod.json") as { quilt_loader?: { id?: unknown; entrypoints?: unknown } };
    const loader = data.quilt_loader;
    if (typeof loader?.id !== "string" || !/^[a-z][a-z0-9-_]{1,63}$/.test(loader.id))
      throw new InputError("quilt.mod.json needs quilt_loader.id in lowercase.");
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
    if (!modId) throw new InputError(`${name} needs a [[mods]] entry with a lowercase modId.`);
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

export function validateProject(
  value: unknown,
  platform: PlatformId = DEFAULT_PLATFORM,
  version: string = PLATFORMS[DEFAULT_PLATFORM].versions[0],
): GeneratedProject {
  if (!value || typeof value !== "object")
    throw new InputError("The provider did not return a project object.");
  const project = value as Record<string, unknown>;
  if (
    typeof project.name !== "string" ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(project.name)
  ) {
    throw new InputError(
      "Project names must use 1–48 letters, numbers, underscores, or hyphens and start with a letter.",
    );
  }
  if (
    !Array.isArray(project.files) ||
    project.files.length === 0 ||
    project.files.length > 30
  )
    throw new InputError("A project must contain 1–30 source files.");
  const seen = new Set<string>();
  let bytes = 0;
  const files = project.files.map((file: unknown) => {
    if (!file || typeof file !== "object")
      throw new InputError("Invalid source file.");
    const { path, content } = file as Record<string, unknown>;
    if (
      typeof path !== "string" ||
      path.length > 200 ||
      path.includes("..") ||
      !(SOURCE_PATH.test(path) || RESOURCE_PATH.test(path))
    ) {
      throw new InputError(
        "Only Java sources and recognised plugin or mod descriptors are accepted; build scripts and unsafe paths are blocked.",
      );
    }
    if (seen.has(path.toLowerCase()))
      throw new InputError("Duplicate source file path.");
    seen.add(path.toLowerCase());
    if (
      typeof content !== "string" ||
      content.includes("\0") ||
      content.length > 40_000
    )
      throw new InputError(
        "Source files must be text and no larger than 40,000 characters.",
      );
    bytes += new TextEncoder().encode(content).length;
    if (bytes > 150_000)
      throw new InputError(
        "Generated project exceeds the 150 KB source limit.",
      );
    return { path, content };
  });
  if (!files.some((file) => file.path.endsWith(".java")))
    throw new InputError(`A ${PLATFORMS[platform].label} project needs Java source.`);
  validateDescriptor(files, platform, version);
  return { name: project.name, files };
}

export function validateRequest(value: unknown): GenerateRequest {
  if (!value || typeof value !== "object")
    throw new InputError("Expected a JSON object.");
  const data = value as Record<string, unknown>;
  if (
    typeof data.prompt !== "string" ||
    data.prompt.trim().length < 12 ||
    data.prompt.length > 4000
  )
    throw new InputError("Describe your plugin in 12–4,000 characters.");
  const platform = data.platform ?? DEFAULT_PLATFORM;
  if (!isPlatformId(platform))
    throw new InputError("Choose a supported platform.");
  if (typeof data.version !== "string")
    throw new InputError(`Choose a version that ${PLATFORMS[platform].label} supports.`);
  const problem = incompatibility(platform, data.version);
  if (problem) throw new InputError(`${problem.title} ${problem.reason}`);
  const modelId = data.modelId ?? DEFAULT_MODEL_ID;
  if (typeof modelId !== "string" || !findModel(modelId))
    throw new InputError("Choose a supported AI model.");
  const reasoningEffort = data.reasoningEffort ?? DEFAULT_REASONING_EFFORT;
  if (typeof reasoningEffort !== "string" || !REASONING_EFFORTS.includes(reasoningEffort as ReasoningEffort))
    throw new InputError("Choose a supported reasoning level.");
  return {
    prompt: data.prompt.trim(),
    platform,
    version: data.version,
    modelId,
    reasoningEffort: reasoningEffort as ReasoningEffort,
    ...(data.project === undefined
      ? {}
      : { project: validateProject(data.project, platform, data.version) }),
  };
}
