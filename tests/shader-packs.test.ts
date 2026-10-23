import assert from "node:assert/strict";
import test from "node:test";
import { artifactSystemPrompt } from "../src/lib/artifact-experts";
import { generateArtifact } from "../src/lib/generation";
import { getArtifact } from "../src/lib/project-store";
import { validateProject, validateRequest } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

const request = { prompt: "Create a warm colour grade and subtle vignette, preserving vanilla rendering.", artifactType: "shader_pack" as const, target: "iris" as const, version: "1.21.11", modelId: "gpt-6-luna" };
const check = (project: unknown) => validateProject(project, "shader_pack", "iris", request.version);
const stage = (path: string) => ({ path, content: "#version 330 compatibility\nvoid main() {}" });
// Test 002's original layout: post-process pair only, with settings at ZIP root.
const original = { name: "WarmHorizon", files: [stage("shaders/composite.vsh"), stage("shaders/composite.fsh"), { path: "shaders.properties", content: "" }] };

test("Test 002 composite-only output never becomes a downloadable success", async () => {
  let calls = 0;
  const result = await generateArtifact(request, { name: "Fixture", async generate() { calls++; return original; } });
  assert.equal(result.status, "failed");
  assert.equal(result.artifactAvailable, false);
  assert.equal(getArtifact(result.id), undefined);
  assert.equal(calls, 1); // No surprise billable auto-retry.
  assert.match(result.error!, /shaders\/shaders.properties/);
  assert.throws(() => check({ ...original, files: original.files.slice(0, 2) }), /gbuffers_terrain/);
});

test("complete shader output packages successfully for Iris and OptiFine", async () => {
  for (const target of ["iris", "optifine"] as const) {
    const result = await generateArtifact({ ...request, target }, { name: "Fixture", async generate() { return shaderPackFixture(); } });
    assert.equal(result.status, "success");
    assert.ok(getArtifact(result.id));
    assert.match(result.logs.join("\n"), /GPU runtime behavior have not been checked/);
  }
});

test("cloud coverage and paired stages are required, including optional passes", () => {
  const fixture = shaderPackFixture();
  assert.throws(() => check({ ...fixture, files: fixture.files.filter(file => !file.path.includes("clouds")) }), /gbuffers_clouds/);
  assert.throws(() => check({ ...fixture, files: [...fixture.files, stage("shaders/final.fsh")] }), /paired stage/);
  assert.throws(() => check({ ...fixture, files: [...fixture.files, stage("shaders/world-1/composite.vsh")] }), /paired stage/);
  assert.doesNotThrow(() => check({ ...fixture, files: [...fixture.files, stage("shaders/world-1/composite.vsh"), stage("shaders/world-1/composite.fsh")] }));
});

test("invented program names and incomplete executable stages are rejected", () => {
  const fixture = shaderPackFixture();
  assert.throws(() => check({ ...fixture, files: [...fixture.files, stage("shaders/world.vsh"), stage("shaders/world.fsh")] }), /Unrecognised shader program/);
  for (const content of ["void main() {}", "// #version 330\nvoid main() {}", "#version 330 compatibility\n// void main() {}"])
    assert.throws(() => check({ ...fixture, files: fixture.files.map((file, index) => index === 0 ? { ...file, content } : file) }), /#version|main\(\)/);
});

test("local and absolute pack includes resolve, missing or escaping includes fail", () => {
  const fixture = shaderPackFixture();
  for (const include of ['"missing.glsl"', '"../outside.glsl"', '"/missing.glsl"'])
    assert.throws(() => check({ ...fixture, files: fixture.files.map((file, index) => index === 0 ? { ...file, content: file.content + `\n#include ${include}` } : file) }), /includes a missing or unsupported/);
  const files = [...fixture.files, { path: "shaders/lib/color.glsl", content: "vec3 identity(vec3 c) { return c; }" }];
  for (const include of ["lib/color.glsl", "/lib/color.glsl"])
    assert.doesNotThrow(() => check({ ...fixture, files: files.map((file, index) => index === 0 ? { ...file, content: file.content + `\n#include "${include}"` } : file) }));
});

test("older incomplete shader projects remain editable without weakening output or path validation", () => {
  assert.deepEqual(validateRequest({ ...request, project: original }).project?.files, original.files);
  assert.throws(() => check(original));
  assert.throws(() => validateRequest({ ...request, project: { ...original, files: [...original.files, { path: "../secret.glsl", content: "" }] } }), /Unsupported/);
});

test("shader playbook teaches geometry coverage, correct settings location and honest verification", () => {
  const prompt = artifactSystemPrompt(request);
  for (const term of ["gbuffers_terrain", "gbuffers_clouds", "shaders/shaders.properties", "lightmap", "alphaTestRef", "day/night", "does not compile GLSL"])
    assert.ok(prompt.includes(term), term);
});
