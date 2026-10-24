import type { GeneratedFile, ShaderReport } from "./types";

export const SHADER_PLAN_PATH = "shader-plan.json";
export const stripShaderComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const kinds = new Set(["baseline", "sky", "lighting", "shadows", "water", "reflections", "atmosphere", "bloom", "other"]);

/** Follow only a feature's citations/includes, never unrelated code elsewhere in the pack.
 * This is bounded lexical evidence, not proof that a sampled value affects an output.
 */
function featureSource(paths: string[], sources: Map<string, string>): string {
  const visited = new Set<string>();
  const pending = [...paths];
  const code: string[] = [];
  while (pending.length) {
    const path = pending.pop()!;
    if (visited.has(path) || !/\.(vsh|fsh|glsl)$/.test(path)) continue;
    visited.add(path);
    const source = sources.get(path);
    if (source === undefined) continue;
    const stripped = stripShaderComments(source);
    code.push(stripped);
    for (const match of stripped.matchAll(/^[ \t]*#[ \t]*include[ \t]+"([^"]+)"/gm)) {
      const include = match[1];
      if (include.includes("..") || include.includes("\\")) continue;
      pending.push(include.startsWith("/") ? `shaders${include}` : path.slice(0, path.lastIndexOf("/") + 1) + include);
    }
  }
  return code.join("\n");
}
function text(value: unknown, label: string, max: number, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim()) || value.length > max || /[\u0000-\u0008\u000b-\u001f\u007f]/.test(value))
    throw new Error(`Shader plan ${label} must be ${allowEmpty ? "0" : "1"}-${max} text characters.`);
  return value.trim();
}

/** Source-linked declarations, not a shader compiler or visual-fidelity evaluator. */
export function readShaderReport(files: GeneratedFile[]): ShaderReport {
  const manifest = files.find(file => file.path === SHADER_PLAN_PATH);
  if (!manifest) throw new Error("Shader output needs shader-plan.json with a reference brief, pipeline and feature status list.");
  let parsed;
  try { parsed = JSON.parse(manifest.content); } catch { throw new Error("shader-plan.json must contain valid JSON."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid shader plan object.");
  if (parsed.unfulfilledRequests !== undefined && (!Array.isArray(parsed.unfulfilledRequests) || parsed.unfulfilledRequests.length > 12))
    throw new Error("Shader plan unmet requests must contain up to 12 text items.");
  const unfulfilledRequests = parsed.unfulfilledRequests?.map((item: unknown) => text(item, "unmet request", 500));
  if (!Array.isArray(parsed.pipeline) || !parsed.pipeline.length || parsed.pipeline.length > 16) throw new Error("Shader plan needs 1-16 pipeline steps.");
  if (!Array.isArray(parsed.features) || !parsed.features.length || parsed.features.length > 12) throw new Error("Shader plan needs 1-12 feature entries.");
  const paths = new Set(files.map(file => file.path));
  const seen = new Set<string>();
  const features: ShaderReport["features"] = parsed.features.map((feature: unknown) => {
    if (!feature || typeof feature !== "object" || Array.isArray(feature)) throw new Error("Invalid shader feature entry.");
    const item = feature as Record<string, unknown>;
    const name = text(item.name, "feature name", 100);
    if (seen.has(name.toLowerCase())) throw new Error("Shader plan feature names must be unique.");
    seen.add(name.toLowerCase());
    if (typeof item.kind !== "string" || !kinds.has(item.kind) || !["implemented", "approximation", "omitted"].includes(String(item.status))
      || !Number.isInteger(item.priority) || Number(item.priority) < 1 || Number(item.priority) > 3)
      throw new Error(`Shader plan feature ${name} needs a valid kind, priority (1-3) and status.`);
    if (!Array.isArray(item.files) || item.files.length > 20 || item.files.some(path => typeof path !== "string" || path.length > 200))
      throw new Error(`Shader feature ${name} needs up to 20 source path strings (200 characters each).`);
    // A report citation is metadata, not a GLSL include. Do not discard usable
    // source because the model named a nonexistent file or a supporting property file.
    const warnings: string[] = [];
    const sourceFiles = [...new Set(item.files as string[])].filter(path => {
      if (paths.has(path) && /^shaders\/.*\.(vsh|fsh|glsl|properties)$/.test(path)) return true;
      warnings.push(`Unresolved source citation: ${path}`);
      return false;
    });
    if (item.status !== "omitted" && !sourceFiles.some(path => /\.(vsh|fsh|glsl)$/.test(path)))
      warnings.push("No executable shader source is cited for this feature; its implementation claim is unsubstantiated.");
    if (item.status === "omitted" && item.files.length)
      warnings.push("The model marked this feature omitted but also cited source; the report is inconsistent.");
    return { name, kind: item.kind, priority: Number(item.priority), status: item.status,
      technique: text(item.technique, "technique", 2000), files: sourceFiles, limitations: text(item.limitations, "limitations", 2000, item.status === "implemented"), ...(warnings.length ? { warnings } : {}) } as ShaderReport["features"][number];
  });
  const sources = new Map(files.map(file => [file.path, file.content]));
  const properties = sources.get("shaders/shaders.properties") || "";
  const misplaced = [...new Set([...properties.matchAll(/^[ \t]*(shadowMapResolution|shadowDistance|shadowIntervalSize|sunPathRotation)[ \t]*=/gm)].map(match => match[1]))];
  if (misplaced.length) {
    const feature = features.find(item => item.kind === "baseline") || features[0];
    (feature.warnings ??= []).push(`Misplaced runtime settings in shaders/shaders.properties: ${misplaced.join(", ")}. These require GLSL const directives; successful driver compilation does not mean these property assignments configure Iris.`);
  }
  for (const feature of features.filter(feature => feature.status === "implemented")) {
    const code = featureSource(feature.files, sources);
    if (feature.kind === "shadows" && !files.some(file => /(?:^|\/)shadow\.vsh$/.test(file.path)))
      (feature.warnings ??= []).push("Cast shadows are reported implemented but no conventional shadow program is supplied; the claim is unsubstantiated.");
    if (feature.kind === "reflections" && (!/\b(?:colortex\d+|gcolor)\b/.test(code) || !/\bdepthtex\d+\b/.test(code)))
      (feature.warnings ??= []).push("Scene reflections are reported implemented without the supported scene colour/depth dependencies in the cited source or its includes; the claim is unsubstantiated.");
    else if (feature.kind === "reflections" && !/\b(?:texture\w*|texelFetch\w*)\s*\(\s*(?:colortex\d+|gcolor)\b/.test(code))
      (feature.warnings ??= []).push("The cited reflection source declares scene buffers but has no direct scene colour texture lookup. Trace the sampler/helper data flow manually; declarations alone do not substantiate landscape reflections.");
  }
  return { goal: text(parsed.goal, "goal", 2000), referenceSummary: text(parsed.referenceSummary, "reference summary", 4000), pipeline: parsed.pipeline.map((step: unknown) => text(step, "pipeline step", 2000)), features, ...(unfulfilledRequests ? { unfulfilledRequests } : {}) };
}
