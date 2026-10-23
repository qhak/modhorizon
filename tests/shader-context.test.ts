import assert from "node:assert/strict";
import test from "node:test";
import { artifactSystemPrompt } from "../src/lib/artifact-experts";
import { estimateProviderInputTokens } from "../src/lib/ai-provider";
import { generateArtifact } from "../src/lib/generation";
import { selectShaderModules, shaderGenerationContext } from "../src/lib/shader-context";
import { readShaderReport } from "../src/lib/shader-report";
import { validateProject, validateRequest } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

const request = { prompt: "Create a subtle warm colour grade.", artifactType: "shader_pack" as const, target: "iris" as const, version: "1.21.11", modelId: "gpt-6-luna" };
const validate = (project: unknown) => validateProject(project, "shader_pack", "iris", "1.21.11");
function changePlan(edit: (plan: ReturnType<typeof readShaderReport>) => unknown) {
  const fixture = shaderPackFixture();
  const plan = readShaderReport(fixture.files);
  return { ...fixture, files: fixture.files.map(file => file.path === "shader-plan.json" ? { ...file, content: JSON.stringify(edit(plan)) } : file) };
}

test("shader modules are task-specific, bounded and respect a water priority", () => {
  assert.deepEqual(selectShaderModules(request), []);
  assert.deepEqual(selectShaderModules({ ...request, prompt: "Change only the sky and sunset gradient." }).map(module => module.id), ["sky"]);
  const water = selectShaderModules({ ...request, prompt: "Beautiful sunset sky and golden clouds, sky gradient, lighting. Focus on water reflections and glass." });
  assert.ok(water.some(module => module.id === "water"));
  assert.equal(water.length, 2);
  assert.deepEqual(water, selectShaderModules({ ...request, prompt: "Beautiful sunset sky and golden clouds, sky gradient, lighting. Focus on water reflections and glass." }));
  assert.doesNotMatch(shaderGenerationContext(request), /bounded screen-space reflection trace/);
  assert.match(shaderGenerationContext({ ...request, prompt: "Reflect nearby trees in a calm lake." }), /scene colour\/depth/);
});

test("image context routes observed techniques and follow-ups preserve accepted features", () => {
  const imageRequest = { ...request, attachments: [{ name: "reference.jpg", type: "image/jpeg", data: "fixture-not-sent" }], project: shaderPackFixture() };
  const context = shaderGenerationContext(imageRequest);
  assert.match(context, /IMAGE BRIEF/);
  assert.match(context, /FOLLOW-UP/);
  assert.match(context, /Retain prior feature entries/);
  assert.doesNotMatch(shaderGenerationContext(request), /IMAGE BRIEF|FOLLOW-UP/);
  assert.ok(context.length < 12_000);
  assert.ok(estimateProviderInputTokens(imageRequest) > estimateProviderInputTokens(request));
  const prompt = artifactSystemPrompt(imageRequest);
  assert.match(prompt, /single response/);
  assert.match(prompt, /shader-plan.json as the FIRST file/);
  assert.equal(prompt.match(/ModHorizon requires explicit root/g)?.length, 1);
});

test("feature plans are required for output but old packs remain editable", () => {
  const fixture = shaderPackFixture();
  const old = { ...fixture, files: fixture.files.filter(file => file.path !== "shader-plan.json") };
  assert.throws(() => validate(old), /needs shader-plan.json/);
  assert.doesNotThrow(() => validateRequest({ ...request, project: old }));
  const report = validate(fixture).shaderReport!;
  assert.equal(report.features[0].status, "implemented");
  assert.deepEqual(report.features[0].files, ["shaders/gbuffers_terrain.fsh", "shaders/gbuffers_clouds.fsh"]);
});

test("feature plans reject invalid states, missing source and fake shadow/reflection dependencies", () => {
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], status: "verified" }] }))), /valid kind/);
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], files: ["shaders/missing.fsh"] }] }))), /missing or non-shader/);
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], files: [] }] }))), /must cite source/);
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], kind: "shadows" }] }))), /no shadow program/);
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], kind: "reflections" }] }))), /scene colour\/depth/);
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [...plan.features, plan.features[0]] }))), /unique/);
});

test("honest approximations and omissions remain visible in one-call generation", async () => {
  const fixture = changePlan(plan => ({ ...plan, features: [...plan.features,
    { name: "Landscape reflections", kind: "reflections", priority: 1, status: "omitted", technique: "Not implemented in this layer", files: [], limitations: "Requires scene colour/depth and water normals" },
    { name: "Sun shafts", kind: "atmosphere", priority: 2, status: "approximation", technique: "Colour approximation only, no occluded shafts", files: ["shaders/gbuffers_terrain.fsh"], limitations: "Not volumetric" },
  ] }));
  let calls = 0;
  const project = await generateArtifact(request, { name: "Fixture", async generate() { calls++; return fixture; } });
  assert.equal(calls, 1);
  assert.equal(project.status, "success"); // Packaged, not a claim of visual acceptance.
  assert.equal(project.shaderReport!.features.find(feature => feature.kind === "reflections")!.status, "omitted");
  assert.match(project.logs.join("\n"), /1 approximated, 1 omitted/);
  assert.match(project.logs.join("\n"), /not runtime-verified/);
});

test("known GLSL hazards are rejected without banning legitimate built-in expressions", () => {
  const fixture = shaderPackFixture();
  const inject = (extra: string) => ({ ...fixture, files: fixture.files.map(file => file.path === "shaders/gbuffers_terrain.vsh" ? { ...file, content: file.content + extra } : file) });
  assert.throws(() => validate(inject("\nuniform mat4 gl_ModelViewMatrix;")), /reserved gl_/);
  assert.throws(() => validate(inject("\n#if HAZE_STRENGTH > 0.0\n#endif")), /floating-point/);
  assert.doesNotThrow(() => validate(inject("\n// uniform mat4 gl_ModelViewMatrix;\n#if SHADOWS == 1\n#endif")));
  assert.doesNotThrow(() => validate(inject("\nvec4 position() { return gl_ModelViewMatrix * gl_Vertex; }")));
});
