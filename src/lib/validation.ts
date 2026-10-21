import {
  MINECRAFT_VERSIONS,
  type ArtifactTarget,
  type ArtifactType,
  type GenerateRequest,
  type GeneratedProject,
} from "./types";
import { DEFAULT_MODEL_ID, findModel } from "./models";
import { ARTIFACT_EXPERTS } from "./artifact-experts";

export const MAX_REQUEST_BYTES = 200_000;
const MAX_SOURCE_BYTES = 150_000;
const MAX_FILE_COUNT = 30;
const MAX_FILE_CHARS = 40_000;
export class InputError extends Error {}

function allowedPath(path: string, kind: ArtifactType): boolean {
  const java = /^src\/main\/java\/(?:[A-Za-z_][A-Za-z0-9_]*\/)*[A-Za-z_][A-Za-z0-9_]*\.java$/;
  if (kind === "plugin")
    return java.test(path) || /^src\/main\/resources\/(plugin|config)\.yml$/.test(path);
  if (kind === "mod")
    return java.test(path) || ["src/main/resources/fabric.mod.json", "src/main/resources/META-INF/mods.toml", "src/main/resources/META-INF/neoforge.mods.toml", "README.md"].includes(path);
  if (kind === "resource_pack")
    return path === "pack.mcmeta" || path === "README.md" || /^assets\/[a-z0-9_.-]+\/[A-Za-z0-9_./-]+\.(json|mcmeta|properties)$/.test(path);
  return path === "shaders.properties" || path === "README.md" || /^shaders\/[A-Za-z0-9_./-]+\.(vsh|fsh|glsl|properties)$/.test(path);
}

function requireFile(files: GeneratedProject["files"], path: string, message: string) {
  if (!files.some((file) => file.path === path)) throw new InputError(message);
}

function validateMod(files: GeneratedProject["files"], target: ArtifactTarget) {
  if (!files.some((file) => file.path.endsWith(".java")))
    throw new InputError("A mod needs at least one Java source file.");
  if (target === "fabric") {
    const file = files.find((item) => item.path === "src/main/resources/fabric.mod.json");
    if (!file) throw new InputError("Fabric mods need src/main/resources/fabric.mod.json.");
    let descriptor: Record<string, unknown>;
    try { descriptor = JSON.parse(file.content) as Record<string, unknown>; }
    catch { throw new InputError("fabric.mod.json must contain valid JSON."); }
    if (typeof descriptor.id !== "string" || !/^[a-z][a-z0-9_-]{1,63}$/.test(descriptor.id) || typeof descriptor.version !== "string" || !descriptor.entrypoints || typeof descriptor.entrypoints !== "object")
      throw new InputError("fabric.mod.json needs a valid id, version, and entrypoints object.");
  } else {
    const path = target === "forge" ? "src/main/resources/META-INF/mods.toml" : "src/main/resources/META-INF/neoforge.mods.toml";
    const file = files.find((item) => item.path === path);
    if (!file) throw new InputError(`${target === "forge" ? "Forge" : "NeoForge"} mods need ${path}.`);
    if (!/^\s*modLoader\s*=\s*"[^"]+"/m.test(file.content) || !/^\s*modId\s*=\s*"[a-z][a-z0-9_]{1,63}"/m.test(file.content))
      throw new InputError(`${path} needs modLoader and a valid modId declaration.`);
  }
}

function validateResourcePack(files: GeneratedProject["files"]) {
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

function validateShaderPack(files: GeneratedProject["files"]) {
  const shaders = files.filter((file) => /^shaders\/.*\.(vsh|fsh|glsl)$/.test(file.path));
  if (!shaders.some((file) => file.path.endsWith(".vsh")) || !shaders.some((file) => file.path.endsWith(".fsh")))
    throw new InputError("A shader pack preview needs at least one .vsh vertex shader and one .fsh fragment shader under shaders/.");
  if (!shaders.some((file) => /^\s*#version\s+\d+/m.test(file.content)))
    throw new InputError("Shader source needs an explicit GLSL #version directive.");
}

export function validateProject(value: unknown, artifactType: ArtifactType = "plugin", target: ArtifactTarget = "paper"): GeneratedProject {
  if (!value || typeof value !== "object") throw new InputError("The provider did not return a project object.");
  const project = value as Record<string, unknown>;
  if (typeof project.name !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,47}$/.test(project.name))
    throw new InputError("Project names must use 1–48 letters, numbers, underscores, or hyphens and start with a letter.");
  if (!Array.isArray(project.files) || project.files.length === 0 || project.files.length > MAX_FILE_COUNT)
    throw new InputError(`A project must contain 1–${MAX_FILE_COUNT} source files.`);
  const seen = new Set<string>();
  let bytes = 0;
  const files = project.files.map((file: unknown) => {
    if (!file || typeof file !== "object") throw new InputError("Invalid source file.");
    const { path, content } = file as Record<string, unknown>;
    if (typeof path !== "string" || path.length > 200 || path.includes("..") || path.startsWith("/") || path.includes("\\") || !allowedPath(path, artifactType))
      throw new InputError(`Unsupported ${artifactType.replace("_", " ")} file path. ${ARTIFACT_EXPERTS[artifactType].sourcePaths}`);
    if (seen.has(path.toLowerCase())) throw new InputError("Duplicate source file path.");
    seen.add(path.toLowerCase());
    if (typeof content !== "string" || content.includes("\0") || content.length > MAX_FILE_CHARS)
      throw new InputError(`Source files must be text and no larger than ${MAX_FILE_CHARS.toLocaleString()} characters.`);
    bytes += new TextEncoder().encode(content).length;
    if (bytes > MAX_SOURCE_BYTES) throw new InputError("Generated project exceeds the 150 KB source limit.");
    return { path, content };
  });

  if (artifactType === "plugin") {
    requireFile(files, "src/main/resources/plugin.yml", "A Paper plugin needs Java source and src/main/resources/plugin.yml.");
    if (!files.some((file) => file.path.endsWith(".java"))) throw new InputError("A Paper plugin needs at least one Java source file.");
    const descriptor = files.find((file) => file.path === "src/main/resources/plugin.yml")!.content;
    const metadata = (key: string) => descriptor.match(new RegExp(`^${key}:\\s*[\"']?([^\\r\\n\"']+)[\"']?\\s*$`, "m"))?.[1]?.trim();
    const mainClass = metadata("main");
    const apiVersion = metadata("api-version");
    if (!metadata("name") || !mainClass || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(mainClass))
      throw new InputError("plugin.yml needs a valid name and fully qualified main class.");
    if (!apiVersion || !/^\d+\.\d+(?:\.\d+)?$/.test(apiVersion)) throw new InputError("plugin.yml needs a valid api-version such as 1.21.");
    const mainPath = `src/main/java/${mainClass.replace(/\./g, "/")}.java`;
    const mainFile = files.find((file) => file.path === mainPath);
    if (!mainFile) throw new InputError("plugin.yml main must point to an included Java source file.");
    const packageName = mainClass.split(".").slice(0, -1).join(".");
    const sourcePackage = mainFile.content.match(/^\s*package\s+([A-Za-z_][\w.]*)\s*;/m)?.[1];
    if (sourcePackage !== packageName)
      throw new InputError("The Java package must match plugin.yml main.");
  } else if (artifactType === "mod") validateMod(files, target);
  else if (artifactType === "resource_pack") validateResourcePack(files);
  else validateShaderPack(files);
  return { name: project.name, files };
}

export function validateRequest(value: unknown): GenerateRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("Expected a JSON object.");
  const data = value as Record<string, unknown>;
  if (typeof data.prompt !== "string" || data.prompt.trim().length < 12 || data.prompt.length > 4000)
    throw new InputError("Describe what to create in 12–4,000 characters.");
  if (!MINECRAFT_VERSIONS.includes(data.version as GenerateRequest["version"])) throw new InputError("Choose a supported Minecraft 1.21.x version.");
  const artifactType = data.artifactType ?? "plugin";
  if (typeof artifactType !== "string" || !Object.hasOwn(ARTIFACT_EXPERTS, artifactType)) throw new InputError("Choose plugin, mod, resource_pack, or shader_pack.");
  const expert = ARTIFACT_EXPERTS[artifactType as ArtifactType];
  const target = data.target ?? (expert.targets.length === 1 ? expert.targets[0] : undefined);
  if (typeof target !== "string" || !expert.targets.includes(target as ArtifactTarget))
    throw new InputError(`Choose a target for this ${expert.label.toLowerCase()}: ${expert.targets.join(", ")}.`);
  const modelId = data.modelId ?? DEFAULT_MODEL_ID;
  if (typeof modelId !== "string" || !findModel(modelId)) throw new InputError("Choose a supported AI model.");
  const request: GenerateRequest = {
    prompt: data.prompt.trim(),
    version: data.version as GenerateRequest["version"],
    artifactType: artifactType as ArtifactType,
    target: target as ArtifactTarget,
    modelId,
    ...(data.project === undefined ? {} : { project: validateProject(data.project, artifactType as ArtifactType, target as ArtifactTarget) }),
  };
  return request;
}
