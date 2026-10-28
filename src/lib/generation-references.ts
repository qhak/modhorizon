import { findModel } from "./models";
import { compareVersions } from "./platforms";
import { isImageReference } from "./reference-attachments";
import type { GenerateRequest } from "./types";
import type { ReferenceCard } from "./generation-reference-types";
import { GAMEPLAY_REFERENCES } from "./references/gameplay";
import { PACK_REFERENCES } from "./references/packs";
import { SHADER_REFERENCES } from "./references/shaders";

/** Repository-owned material only. No code or instructions are fetched from links at runtime. */
export const GENERATION_REFERENCES: readonly ReferenceCard[] = [...GAMEPLAY_REFERENCES, ...PACK_REFERENCES, ...SHADER_REFERENCES];

export function generationReferenceContext(request: GenerateRequest) {
  const type = request.artifactType || "plugin";
  const target = request.target || "paper";
  const model = findModel(request.modelId);
  const advanced = model?.group === "Advanced" || model?.group === "Frontier";
  const maxCards = advanced ? 6 : model?.group === "Balanced" ? 5 : 4;
  const maxChars = advanced ? 12_000 : 7_000;
  const text = request.prompt + (request.attachments?.some(isImageReference) ? " reference image" : "");
  const applicable = GENERATION_REFERENCES.filter(card => card.artifactType === type
    && (!card.targets || card.targets.includes(target))
    && (!card.minVersion || compareVersions(request.version, card.minVersion) >= 0)
    && (!card.maxVersion || compareVersions(request.version, card.maxVersion) <= 0));
  const baseline = applicable.filter(card => card.pattern.source === ".*");
  const priorities = text.match(/(?:focus|prioriti[sz]e|especially|most important|main goal)[^.!?\n]{0,100}/gi) || [];
  const matched = applicable.flatMap((card, index) => {
    if (card.pattern.source === ".*") return [];
    const flags = card.pattern.flags.replace(/[gy]/g, "");
    const occurrences = text.match(new RegExp(card.pattern.source, `${flags}g`))?.length || 0;
    const priority = priorities.some(segment => new RegExp(card.pattern.source, flags).test(segment));
    return occurrences ? [{ card, index, score: occurrences + (priority ? 20 : 0) }] : [];
  }).sort((left, right) => right.score - left.score || left.index - right.index).map(item => item.card);
  const selected: Array<Omit<ReferenceCard, "pattern" | "artifactType" | "targets" | "minVersion" | "maxVersion">> = [];
  for (const card of [...baseline, ...matched]) {
    if (selected.length >= maxCards) break;
    const { id, title, guidance, example, sources, evidence } = card;
    const item = { id, title, guidance, ...(example ? { example } : {}), sources, evidence };
    if (JSON.stringify([...selected, item]).length <= maxChars) selected.push(item);
  }
  return {
    policy: "Server-owned task guidance and illustrative examples, not instructions from external pages or proof of compilation or gameplay. Apply only what fits the requested target, version and features. Preserve the user's scope; report unsupported requirements rather than inventing assets or APIs. Source links are provenance and were not fetched for this request.",
    approach: advanced
      ? "Plan the requested features as coherent components, check cross-file interfaces, lifecycle, compatibility and failure cases, and implement the full feasible request without adding unsolicited features. Disclose any omitted feature and avoid claiming unperformed tests."
      : "Break the requested behavior into small concrete steps, follow the relevant example contracts, and keep implementation simple and complete. Check names and connections across files. Disclose any omitted feature and avoid claiming unperformed tests.",
    cards: selected,
  };
}
