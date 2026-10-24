import assert from "node:assert/strict";
import test from "node:test";
import { artifactSystemPrompt } from "../src/lib/artifact-experts";
import { estimateProviderInputTokens } from "../src/lib/ai-provider";
import { generateArtifact } from "../src/lib/generation";
import { selectShaderModules, shaderGenerationContext, shaderGuidanceModules } from "../src/lib/shader-context";
import { readShaderReport } from "../src/lib/shader-report";
import { normalizeShaderMatrices } from "../src/lib/shader-normalization";
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
  assert.ok(context.length < 22_000);
  assert.ok(estimateProviderInputTokens(imageRequest) > estimateProviderInputTokens(request));
  const prompt = artifactSystemPrompt(imageRequest);
  assert.match(prompt, /single response/);
  assert.match(prompt, /shader-plan.json as the FIRST file/);
  assert.equal(prompt.match(/ModHorizon requires explicit root/g)?.length, 1);
});

test("image-only briefs receive engineering guidance without changing text-ranked example selection", () => {
  const imageRequest = { ...request, prompt: "Make it look like this. No bloom or water changes.",
    attachments: [{ name: "look.png", type: "image/png", data: "fixture" }] };
  const guidance = shaderGuidanceModules(imageRequest);
  assert.equal(new Set(guidance.map(module => module.id)).size, 5);
  assert.ok(guidance.some(module => module.id === "lighting"));
  assert.ok(guidance.some(module => module.id === "stylized"));
  assert.ok(selectShaderModules(imageRequest).length <= 2);
  assert.deepEqual(shaderGuidanceModules(request), selectShaderModules(request));
  assert.deepEqual(shaderGuidanceModules({ ...request, attachments: [{ name: "brief.txt", type: "text/plain", data: "text" }] }), selectShaderModules(request));
  const context = shaderGenerationContext(imageRequest);
  assert.match(context, /Explicit constraints.*take priority/);
  assert.match(context, /DESIGN REVIEW/);
  assert.match(context, /ACCEPTANCE REVIEW/);
  assert.match(context, /fixed-camera shader on\/off/);
  assert.ok(estimateProviderInputTokens(imageRequest) > estimateProviderInputTokens(request));
});

test("reflection evidence cannot borrow unrelated buffers or comment-only texture lookups", () => {
  const fixture = changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], kind: "reflections" }] }));
  fixture.files.push({ path: "shaders/unrelated.glsl", content: "uniform sampler2D colortex4; uniform sampler2D depthtex1;" });
  let report = readShaderReport(fixture.files);
  assert.match(report.features[0].warnings!.join("\n"), /in the cited source or its includes/);
  fixture.files = fixture.files.map(file => file.path === "shaders/gbuffers_terrain.fsh" ? { ...file,
    content: file.content + '\n#include "/lib/reflection.glsl"' } : file);
  fixture.files.push({ path: "shaders/lib/reflection.glsl", content: '#include "buffers.glsl"\n// texture2D(colortex4, uv);' });
  fixture.files.push({ path: "shaders/lib/buffers.glsl", content: "uniform sampler2D colortex4; uniform sampler2D depthtex1;" });
  report = readShaderReport(fixture.files);
  assert.match(report.features[0].warnings!.join("\n"), /no direct scene colour texture lookup/);
  fixture.files[fixture.files.length - 2].content += "\nvec3 lookup(vec2 uv) { return texture2D(colortex4, uv).rgb; }";
  assert.equal(readShaderReport(fixture.files).features[0].warnings, undefined);
});

test("feature evidence traversal terminates on cycles and missing includes without hiding source validation", () => {
  const fixture = changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], kind: "reflections", files: ["shaders/a.glsl"] }] }));
  fixture.files.push({ path: "shaders/a.glsl", content: '#include "b.glsl"\n#include "missing.glsl"' });
  fixture.files.push({ path: "shaders/b.glsl", content: '#include "a.glsl"' });
  assert.match(readShaderReport(fixture.files).features[0].warnings!.join("\n"), /unsubstantiated/);
  assert.throws(() => validate(fixture), /includes a missing|cycle/);
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

test("misplaced shadow constants warn without discarding source or mislabeling ordinary properties", () => {
  const fixture = shaderPackFixture();
  const properties = fixture.files.find(file => file.path === "shaders/shaders.properties")!;
  properties.content += "\nshadowMapResolution=2048\nshadowDistance =112.0\nshadowIntervalSize=2.0\nsunPathRotation=0.0\n# shadowMapResolution=4096\nblend.gbuffers_water=off\n";
  const result = validate(fixture);
  assert.deepEqual(result.files, fixture.files);
  assert.match(result.shaderReport!.features[0].warnings!.join("\n"), /Misplaced runtime settings.*shadowMapResolution, shadowDistance, shadowIntervalSize, sunPathRotation/);
  properties.content = "# shadowMapResolution=4096\nblend.gbuffers_water=off\nsliders=EXPOSURE\n";
  fixture.files.push({ path: "shaders/lib/metadata.glsl", content: "const int shadowMapResolution=2048; const float shadowDistance=112.0;" });
  assert.equal(validate(fixture).shaderReport!.features[0].warnings, undefined);
});

test("feature plans reject invalid schemas but flag unsupported claims without discarding shader source", () => {
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [{ ...plan.features[0], status: "verified" }] }))), /valid kind/);
  const warningsFor = (edit: Parameters<typeof changePlan>[0]) => validate(changePlan(edit)).shaderReport!.features[0].warnings!.join("\n");
  assert.match(warningsFor(plan => ({ ...plan, features: [{ ...plan.features[0], files: ["shaders/missing.fsh"] }] })), /Unresolved source citation: shaders\/missing.fsh/);
  assert.match(warningsFor(plan => ({ ...plan, features: [{ ...plan.features[0], files: [] }] })), /No executable shader source/);
  assert.match(warningsFor(plan => ({ ...plan, features: [{ ...plan.features[0], kind: "shadows" }] })), /no conventional shadow program/);
  assert.match(warningsFor(plan => ({ ...plan, features: [{ ...plan.features[0], kind: "reflections" }] })), /scene colour\/depth/);
  assert.throws(() => validate(changePlan(plan => ({ ...plan, features: [...plan.features, plan.features[0]] }))), /unique/);
});

test("report source citations accept supporting properties and expose broken references without extra model calls", async () => {
  const fixture = changePlan(plan => ({ ...plan, features: [{ ...plan.features[0],
    files: ["shaders/gbuffers_terrain.fsh", "shaders/block.properties", "shaders/not-generated.fsh", "README.md"],
  }] }));
  fixture.files.push({ path: "shaders/block.properties", content: "block.100=minecraft:water" });
  const clean = validate(fixture);
  const feature = clean.shaderReport!.features[0];
  assert.deepEqual(feature.files, ["shaders/gbuffers_terrain.fsh", "shaders/block.properties"]);
  assert.equal(feature.warnings!.length, 2);
  assert.match(feature.warnings!.join("\n"), /not-generated.fsh/);
  assert.deepEqual(validate(clean), clean);
  let calls = 0;
  const project = await generateArtifact(request, { name: "Fixture", async generate() { calls++; return fixture; } });
  assert.equal(calls, 1);
  assert.equal(project.status, "success");
  assert.equal(project.artifactAvailable, true);
  assert.deepEqual(project.files.find(file => file.path === "shader-plan.json"), fixture.files.find(file => file.path === "shader-plan.json"));
  assert.ok(project.logs.some(line => /Feature report warning.*not-generated.fsh/.test(line)));
  // Citation tolerance never relaxes actual runtime source/include validation.
  const broken = { ...fixture, files: fixture.files.map(file => file.path.endsWith("terrain.fsh")
    ? { ...file, content: file.content + '\n#include "not-generated.glsl"' } : file) };
  assert.throws(() => validate(broken), /includes a missing/);
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
  assert.throws(() => validate(inject("\nuniform mat4 gl_UnknownMatrix;")), /reserved gl_ input gl_UnknownMatrix/);
  assert.throws(() => validate(inject("\n#if HAZE_STRENGTH > 0.0\n#endif")), /floating-point/);
  assert.doesNotThrow(() => validate(inject("\n// uniform mat4 gl_ModelViewMatrix;\n#if SHADOWS == 1\n#endif")));
  assert.doesNotThrow(() => validate(inject("\nvec4 position() { return gl_ModelViewMatrix * gl_Vertex; }")));
});

test("legacy built-in matrix cleanup preserves uses, comments, line numbers and one-call packaging", async () => {
  const fixture = shaderPackFixture();
  const source = `#version 120
// uniform mat4 gl_UnknownMatrix;
uniform mat4 gl_ModelViewMatrix; // redundant
uniform mat3 gl_NormalMatrix;
uniform mat4 gl_TextureMatrix[gl_MaxTextureCoords];
void main() { gl_Position = gl_ModelViewMatrix * gl_Vertex; }
`;
  fixture.files = fixture.files.map(file => file.path === "shaders/gbuffers_terrain.vsh" ? { ...file, content: source } : file);
  const cleaned = validate(fixture);
  const output = cleaned.files.find(file => file.path === "shaders/gbuffers_terrain.vsh")!.content;
  assert.match(output, /gl_Position = gl_ModelViewMatrix \* gl_Vertex/);
  assert.match(output, /\/\/ redundant/);
  assert.match(output, /\/\/ uniform mat4 gl_UnknownMatrix;/);
  assert.doesNotMatch(output, /^uniform/m);
  assert.equal(output.split("\n").length, source.split("\n").length);
  assert.equal(fixture.files.find(file => file.path === "shaders/gbuffers_terrain.vsh")!.content, source);
  assert.match(cleaned.message!, /3 redundant/);
  assert.deepEqual(validate(cleaned), cleaned);
  let calls = 0;
  const project = await generateArtifact(request, { name: "Fixture", async generate() { calls++; return fixture; } });
  assert.equal(calls, 1);
  assert.equal(project.status, "success");
  assert.equal(project.artifactAvailable, true);
  assert.match(project.message!, /Automatic compatibility cleanup/);
});

test("cleanup leaves unsupported declarations and profiles for explicit rejection", () => {
  const bodies = [
    "#version 330 core\nuniform mat4 gl_ModelViewMatrix;",
    "#version 150 compatibility\nuniform mat4 gl_ModelViewMatrix;",
    "#version 120\nuniform mat3 gl_ModelViewMatrix;",
    "#version 120\nuniform mat4 gl_UnknownMatrix;",
    "#version 120\nuniform mat4 gl_ModelViewMatrix, customMatrix;",
    "#version 120\nuniform mat4 gl_ModelViewMatrix = mat4(1.0);",
    "#version 120\n#define gl_ModelViewMatrix myMatrix\nuniform mat4 gl_ModelViewMatrix;",
    "#version 120\n/* uniform mat4 gl_ModelViewMatrix; */\nvoid main() {}",
  ];
  for (const content of bodies) {
    const files = [{ path: "shaders/composite.fsh", content }];
    assert.deepEqual(normalizeShaderMatrices(files), { files, repairs: [] });
  }
  const include = [{ path: "shaders/shared.glsl", content: "uniform mat4 gl_ModelViewMatrix;" }];
  assert.deepEqual(normalizeShaderMatrices(include), { files: include, repairs: [] });
  const fixture = shaderPackFixture();
  fixture.files.push({ path: "shaders/shared.glsl", content: "/* first\nsecond */\nuniform mat4 gl_Unknown;" });
  assert.throws(() => validate(fixture), /shaders\/shared.glsl:3.*gl_Unknown/);
});
