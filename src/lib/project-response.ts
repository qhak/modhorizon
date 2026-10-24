import type { ArtifactType } from "./types";

export const PROJECT_NAME_PATTERN = "^[A-Za-z][A-Za-z0-9_-]{0,47}$";
const projectName = new RegExp(PROJECT_NAME_PATTERN);

/** Shader archive label only. Never rename executable source, paths or plugin classes. */
function shaderArchiveName(value: unknown): unknown {
  if (typeof value !== "string" || projectName.test(value) || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) return value;
  let slug = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!/[A-Za-z0-9]/.test(slug)) return value; // Leave empty/unusable names for validation.
  if (!/^[A-Za-z]/.test(slug)) slug = `Shader-${slug}`;
  return slug.slice(0, 48).replace(/-+$/g, "");
}

export const REQUIRED_SHADER_STAGE_PATHS = [
  "shaders/gbuffers_terrain.vsh", "shaders/gbuffers_terrain.fsh",
  "shaders/gbuffers_clouds.vsh", "shaders/gbuffers_clouds.fsh",
] as const;

const FILES_SCHEMA = { type: "array", items: { type: "object", additionalProperties: false,
  properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } };
const PROJECT_SCHEMA = { type: "object", additionalProperties: false,
  properties: { name: { type: "string" }, message: { type: "string" }, files: FILES_SCHEMA },
  required: ["name", "files", "message"] };
const SHADER_SCHEMA = { type: "object", additionalProperties: false,
  properties: {
    name: { type: "string", pattern: PROJECT_NAME_PATTERN }, message: { type: "string" },
    requiredFiles: { type: "object", additionalProperties: false,
      properties: Object.fromEntries(REQUIRED_SHADER_STAGE_PATHS.map(path => [path, { type: "string" }])),
      required: [...REQUIRED_SHADER_STAGE_PATHS] },
    files: FILES_SCHEMA,
  }, required: ["name", "message", "requiredFiles", "files"] };

export function projectResponseSchema(artifactType: "shader_pack"): typeof SHADER_SCHEMA;
export function projectResponseSchema(artifactType?: ArtifactType): typeof PROJECT_SCHEMA | typeof SHADER_SCHEMA;
export function projectResponseSchema(artifactType?: ArtifactType) {
  return artifactType === "shader_pack" ? SHADER_SCHEMA : PROJECT_SCHEMA;
}

export function projectResponseInstructions(artifactType?: ArtifactType) {
  if (artifactType !== "shader_pack") return 'Return exactly one JSON object with this shape: {"name":"ProjectName","files":[{"path":"relative/path","content":"text"}],"message":"text"}. Never include markdown fences or fields beyond name, files and message.';
  return `Return exactly one JSON object with name, message, requiredFiles and files. name is a filename-safe project identifier: 1-48 ASCII letters, digits, underscores or hyphens, starting with a letter (for example GoldenHourWater). Put a human-readable title in message or README. requiredFiles is an object with these exact mandatory keys, each containing the complete generated GLSL source string: ${REQUIRED_SHADER_STAGE_PATHS.join(", ")}. Write the actual source for all four stages, including a leading #version and main() wrapper even when using shared includes; never return empty strings or a plan instead of executable code. files is the array of additional {path,content} files, starting with shader-plan.json, followed by helpers, other passes, settings and README. Do not repeat a requiredFiles path in files. The server only converts your supplied strings to those exact paths; it does not supply a renderer or fill missing code. Never include markdown fences or other top-level fields.`;
}

export class ShaderEnvelopeError extends Error {}

/** Convert provider transport fields into ordinary model-authored source; never synthesize GLSL.
 * Classic complete file-list responses remain readable for legacy/custom providers.
 */
export function normalizeProjectResponse(value: unknown, artifactType?: ArtifactType): unknown {
  if (artifactType !== "shader_pack" || !value || typeof value !== "object" || Array.isArray(value)) return value;
  const original = value as Record<string, unknown>;
  const name = shaderArchiveName(original.name);
  const project = name === original.name ? original : { ...original, name };
  if (!Object.hasOwn(project, "requiredFiles")) return project;
  const required = project.requiredFiles;
  if (!required || typeof required !== "object" || Array.isArray(required) || !Array.isArray(project.files))
    throw new ShaderEnvelopeError("Shader response needs a requiredFiles object and additional files array.");
  const stages = required as Record<string, unknown>;
  if (Object.keys(stages).some(path => !(REQUIRED_SHADER_STAGE_PATHS as readonly string[]).includes(path)))
    throw new ShaderEnvelopeError("requiredFiles contains an unsupported key; place other source in files.");
  for (const path of REQUIRED_SHADER_STAGE_PATHS) {
    if (!Object.hasOwn(stages, path) || typeof stages[path] !== "string" || !(stages[path] as string).trim())
      throw new ShaderEnvelopeError(`requiredFiles must contain nonempty generated source for ${path}.`);
  }
  if (project.files.some(file => file && typeof file === "object" && "path" in file
    && (REQUIRED_SHADER_STAGE_PATHS as readonly unknown[]).includes(file.path)))
    throw new ShaderEnvelopeError("Required shader stage paths must not be duplicated in the additional files array.");
  const isPlan = (file: unknown) => !!file && typeof file === "object" && "path" in file && file.path === "shader-plan.json";
  const files = [...project.files.filter(isPlan),
    ...REQUIRED_SHADER_STAGE_PATHS.map(path => ({ path, content: stages[path] })),
    ...project.files.filter(file => !isPlan(file))];
  const { requiredFiles: _transport, ...rest } = project;
  return { ...rest, files };
}
