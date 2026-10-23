import type { GeneratedFile, ShaderReport } from "./types";

export const SHADER_PLAN_PATH = "shader-plan.json";
export const stripShaderComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const kinds = new Set(["baseline", "sky", "lighting", "shadows", "water", "reflections", "atmosphere", "bloom", "other"]);
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
  if (!Array.isArray(parsed.pipeline) || !parsed.pipeline.length || parsed.pipeline.length > 6) throw new Error("Shader plan needs 1-6 pipeline steps.");
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
    if (!Array.isArray(item.files) || item.files.length > 20 || item.files.some(path => typeof path !== "string" || !paths.has(path) || !/\.(vsh|fsh|glsl)$/.test(path)))
      throw new Error(`Shader feature ${name} cites missing or non-shader source.`);
    if ((item.status === "omitted") !== (item.files.length === 0))
      throw new Error(`Shader feature ${name} must cite source when implemented/approximated and no files when omitted.`);
    return { name, kind: item.kind, priority: Number(item.priority), status: item.status,
      technique: text(item.technique, "technique", 500), files: item.files as string[], limitations: text(item.limitations, "limitations", 600, item.status === "implemented") } as ShaderReport["features"][number];
  });
  const code = files.filter(file => /\.(vsh|fsh|glsl)$/.test(file.path)).map(file => stripShaderComments(file.content)).join("\n");
  for (const feature of features.filter(feature => feature.status === "implemented")) {
    if (feature.kind === "shadows" && !files.some(file => /(?:^|\/)shadow\.vsh$/.test(file.path)))
      throw new Error("Cast shadows are reported implemented but no shadow program is supplied. Implement shadow mapping or report an approximation/omission.");
    if (feature.kind === "reflections" && (!/\b(?:colortex\d+|gcolor)\b/.test(code) || !/\bdepthtex\d+\b/.test(code)))
      throw new Error("Scene reflections are reported implemented without scene colour/depth dependencies. Implement the supported reflection pipeline or report the sky/tint approximation honestly.");
  }
  return { goal: text(parsed.goal, "goal", 500), referenceSummary: text(parsed.referenceSummary, "reference summary", 900), pipeline: parsed.pipeline.map((step: unknown) => text(step, "pipeline step", 300)), features };
}
