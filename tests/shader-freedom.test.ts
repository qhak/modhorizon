import assert from "node:assert/strict";
import test from "node:test";
import { validateProject, validateRequest } from "../src/lib/validation";
import { defaultReasoningForArtifact } from "../src/lib/models";
import { shaderGenerationContext, selectShaderModules } from "../src/lib/shader-context";
import { shaderPackFixture } from "./fixtures/shader-pack";

const request = { prompt: "Create a cinematic sunset with directional light and reflected water.", artifactType: "shader_pack", target: "iris", version: "1.21.11", modelId: "gpt-6-luna" };

test("detailed pipeline descriptions survive validation with bounded schema checks", () => {
  const fixture = shaderPackFixture();
  const manifest = fixture.files.find(file => file.path === "shader-plan.json")!;
  const plan = JSON.parse(manifest.content);
  plan.pipeline = Array.from({ length: 16 }, () => "p".repeat(2000));
  plan.goal = "g".repeat(2000); plan.referenceSummary = "r".repeat(4000);
  plan.features[0].technique = "t".repeat(2000); plan.features[0].limitations = "l".repeat(2000);
  manifest.content = JSON.stringify(plan);
  assert.equal(validateProject(fixture, "shader_pack", "iris", "1.21.11").shaderReport!.pipeline[0].length, 2000);
  for (const bad of ["x".repeat(2001), "", 42]) {
    manifest.content = JSON.stringify({ ...plan, pipeline: [bad] });
    assert.throws(() => validateProject(fixture, "shader_pack", "iris", "1.21.11"), /pipeline step/);
  }
});

test("shaders accept more helpers and larger individual files while retaining total source bounds", () => {
  const fixture = shaderPackFixture();
  while (fixture.files.length < 60) fixture.files.push({ path: `shaders/lib/helper${fixture.files.length}.glsl`, content: "// helper" });
  fixture.files.at(-1)!.content = "//" + "x".repeat(79998);
  assert.equal(validateProject(fixture, "shader_pack", "iris", "1.21.11").files.length, 60);
  fixture.files.at(-2)!.content = "//" + "y".repeat(79998);
  assert.throws(() => validateProject(fixture, "shader_pack", "iris", "1.21.11"), /150 KB/);
  fixture.files.at(-2)!.content = "// helper";
  fixture.files.at(-1)!.content += "x";
  assert.throws(() => validateProject(fixture, "shader_pack", "iris", "1.21.11"), /80,000/);
  fixture.files.at(-1)!.content = "// helper";
  fixture.files.push({ path: "shaders/lib/extra.glsl", content: "// extra" });
  assert.throws(() => validateProject(fixture, "shader_pack", "iris", "1.21.11"), /60 source files/);
});

test("shader defaults request high reasoning without overriding explicit choices or other artifacts", () => {
  assert.equal(validateRequest(request).reasoningEffort, "high");
  assert.equal(validateRequest({ ...request, reasoningEffort: "medium" }).reasoningEffort, "medium");
  assert.equal(defaultReasoningForArtifact("gpt-6-luna", "plugin"), "medium");
  assert.equal(selectShaderModules({ ...validateRequest(request), prompt: "Sunset sky, directional lighting, water reflections, bloom and haze." }).length, 4);
  const context = shaderGenerationContext(validateRequest(request));
  assert.match(context, /IMPLEMENTATION DEPTH/);
  assert.match(context, /60 files/);
  assert.doesNotMatch(context, /Apply the most important one or two layers first/);
});
