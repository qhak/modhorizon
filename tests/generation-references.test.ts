import assert from "node:assert/strict";
import test from "node:test";
import { GENERATION_REFERENCES, generationReferenceContext } from "../src/lib/generation-references";
import { selectGenerationSkills } from "../src/lib/generation-skills";
import { selectArtifactSkills } from "../src/lib/artifact-experts";
import { createAIProvider, estimateProviderInputTokens } from "../src/lib/ai-provider";
import { MockProvider } from "../src/lib/mock-provider";
import type { GenerateRequest } from "../src/lib/types";

const request: GenerateRequest = { prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", artifactType: "plugin", target: "paper", version: "1.21.4", modelId: "gpt-6-luna" };
const ids = (input: GenerateRequest) => generationReferenceContext(input).cards.map(card => card.id);

test("each artifact receives scoped, server-owned baseline guidance", () => {
  const cases: Array<[GenerateRequest, string]> = [
    [request, "paper-base"],
    [{ ...request, artifactType: "mod", target: "fabric" }, "fabric-base"],
    [{ ...request, artifactType: "datapack", target: "vanilla" }, "datapack-layout-and-version"],
    [{ ...request, artifactType: "resource_pack", target: "vanilla" }, "resource-pack-boundaries"],
    [{ ...request, artifactType: "shader_pack", target: "iris", version: "1.21.11" }, "shader-general-contract"],
  ];
  for (const [input, baseline] of cases) assert.ok(ids(input).includes(baseline), `${input.artifactType} missing ${baseline}`);
  assert.equal(new Set(GENERATION_REFERENCES.map(card => card.id)).size, GENERATION_REFERENCES.length);
  assert.ok(GENERATION_REFERENCES.every(card => card.sources.length && card.evidence));
});

test("loader, exact version and artifact boundaries prevent irrelevant examples", () => {
  assert.ok(ids(request).includes("paper-zombie-speed-verified"));
  assert.ok(!ids({ ...request, version: "1.21.11" }).includes("paper-zombie-speed-verified"));
  assert.ok(ids({ ...request, artifactType: "mod", target: "fabric" }).includes("fabric-base"));
  assert.ok(!ids({ ...request, artifactType: "mod", target: "fabric" }).includes("paper-base"));
  assert.ok(ids({ ...request, artifactType: "mod", target: "forge", version: "1.12.2" }).includes("forge-legacy-base"));
  assert.ok(!ids({ ...request, artifactType: "mod", target: "forge", version: "1.12.2" }).includes("forge-modern-base"));
  const pack = { ...request, artifactType: "resource_pack" as const, target: "vanilla" as const, prompt: "Make diamond tools red" };
  assert.ok(ids(pack).includes("resource-diamond-recolor"));
  assert.ok(!ids({ ...pack, version: "1.20.4" }).includes("resource-diamond-recolor"));
  const shader = { ...request, artifactType: "shader_pack" as const, target: "iris" as const, version: "1.21.11", prompt: "Add reflections to water" };
  assert.ok(ids(shader).includes("shader-iris-water-reflection"));
  assert.ok(!ids({ ...shader, target: "optifine" }).includes("shader-iris-water-reflection"));
});

test("model tiers use whole, bounded relevant cards and image reference cues", () => {
  const complex = { ...request, prompt: "Create an arena team game with a countdown, commands, permission, cooldown, menu, shop, inventory, event, kill, zombie, persistence, configuration and progress." };
  const economy = generationReferenceContext(complex);
  const frontier = generationReferenceContext({ ...complex, modelId: "claude-fable-5-1" });
  assert.ok(economy.cards.length <= 4);
  assert.ok(frontier.cards.length > economy.cards.length && frontier.cards.length <= 6);
  assert.ok(JSON.stringify(economy.cards).length <= 7000);
  assert.ok(JSON.stringify(frontier.cards).length <= 12000);
  const withImage = { ...request, artifactType: "shader_pack" as const, target: "iris" as const, version: "1.21.11", prompt: "Make it look good", attachments: [{ name: "ref.png", type: "image/png", data: "data:image/png;base64,AA==" }] };
  assert.ok(ids(withImage).includes("shader-reference-image-interpretation"));
  assert.ok(!ids({ ...withImage, attachments: [] }).includes("shader-reference-image-interpretation"));
});

test("Folia guidance avoids standard Bukkit scheduling and single-thread assumptions", () => {
  const prompt = "Create a timed countdown every 10 seconds with async performance";
  const timer = selectGenerationSkills(prompt, "folia").find(skill => skill.id === "timed-mechanics")!;
  assert.match(timer.guidance, /Folia scheduler/);
  assert.doesNotMatch(timer.guidance, /use the synchronous Bukkit scheduler/i);
  const thread = selectArtifactSkills({ ...request, target: "folia", prompt }).find(skill => skill.label === "Server-thread safety")!;
  assert.match(thread.guidance, /region scheduler/);
});

test("the provider receives the selected reference and quote input includes it", async t => {
  const oldKey = process.env.OPENAI_API_KEY, oldMode = process.env.AI_TESTING_MODE;
  process.env.OPENAI_API_KEY = "fixture"; process.env.AI_TESTING_MODE = "false";
  const fixture = await new MockProvider().generate(request);
  let userInput = "", systemInput = "", schema = "";
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    systemInput = body.input[0].content;
    userInput = body.input[1].content;
    schema = JSON.stringify(body.text.format.schema);
    return Response.json({ status: "completed", output_text: JSON.stringify(fixture), usage: { input_tokens: 100, output_tokens: 100 } });
  });
  try {
    await createAIProvider("gpt-6-luna").generate(request);
    const input = JSON.parse(userInput);
    assert.ok(input.referenceGuidance.cards.some((card: { id: string }) => card.id === "paper-zombie-speed-verified"));
    assert.match(input.referenceGuidance.policy, /not.*proof/i);
    assert.equal(estimateProviderInputTokens(request), Math.ceil((systemInput.length + userInput.length + schema.length) / 3));
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
    if (oldMode === undefined) delete process.env.AI_TESTING_MODE; else process.env.AI_TESTING_MODE = oldMode;
  }
});
