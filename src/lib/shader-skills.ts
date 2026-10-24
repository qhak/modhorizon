import library from "./shader-skill-library.json";
import { selectShaderModules } from "./shader-context";
import type { GenerateRequest } from "./types";

export const MAX_SHADER_SKILL_CHARS = 16_000;

/** Curated, bundled knowledge: no runtime URL fetches, extra model calls or persona agents. */
export function shaderSkillContext(request: GenerateRequest) {
  const applicable = request.target === library.profile.target && request.version === library.profile.minecraft;
  const imageLed = request.attachments?.some(file => file.type.startsWith("image/"));
  const modules = selectShaderModules(request).map(module => module.id);
  const skills = applicable ? library.skills.filter(skill => !skill.modules.length || imageLed ||
    skill.modules.some(module => modules.includes(module as typeof modules[number]))) : [];
  const referenceIds = new Set(skills.flatMap(skill => skill.references));
  const context = {
    version: library.version,
    reviewed: library.reviewed,
    role: "Specialist skill cards, not people or separately running agents. Apply relevant methods and failure lessons; explicit user instructions outrank inferred reference cues. These references are distilled context, not a complete renderer or a fixed sunset preset.",
    applicability: applicable ? "Curated for Iris / Minecraft 1.21.11. Rolling documentation is not a version guarantee; check interfaces before use."
      : "Runtime differs from the curated Iris 1.21.11 profile. Detailed recipes withheld; do not assume these interfaces apply.",
    evidencePolicy: "Documentation establishes interfaces, local cases establish only their stated observations. Links are provenance, not fetched content. No reference, example, compile result or workflow proves this new output works. Retain source citations, name approximations and document acceptance checks.",
    catalog: library.skills.map(({ id, label, purpose }) => ({ id, label, purpose })),
    skills,
    references: library.references.filter(reference => referenceIds.has(reference.id)),
  };
  // Keep whole cards and only their references. Never silently cut a method mid-sentence.
  while (JSON.stringify(context).length > MAX_SHADER_SKILL_CHARS && context.skills.length > 1) {
    context.skills.pop();
    const used = new Set(context.skills.flatMap(skill => skill.references));
    context.references = context.references.filter(reference => used.has(reference.id));
  }
  return context;
}
