import assert from "node:assert/strict";
import test from "node:test";
import library from "../src/lib/shader-skill-library.json";
import { MAX_SHADER_SKILL_CHARS, shaderSkillContext } from "../src/lib/shader-skills";
import { estimateProviderInputTokens } from "../src/lib/ai-provider";

const base = { artifactType: "shader_pack" as const, target: "iris" as const, version: "1.21.11", prompt: "Create a simple shader." };

test("skill references resolve and distinguish documentation from local observations", () => {
  const ids = new Set(library.references.map(reference => reference.id));
  assert.equal(ids.size, library.references.length);
  assert.equal(new Set(library.skills.map(skill => skill.id)).size, library.skills.length);
  for (const skill of library.skills) {
    assert.ok(skill.references.length >= 3);
    for (const id of skill.references) assert.ok(ids.has(id), `${skill.id}: ${id}`);
    assert.ok(skill.workflow.length && skill.alternatives.length >= 2 && skill.failurePairs.length && skill.acceptance.length);
  }
  for (const reference of library.references) {
    if (reference.kind === "primary-documentation") assert.match(reference.url!, /^https:\/\/shaders\.properties\//);
    else assert.equal(reference.kind, "local-case");
  }
});

test("task routing supplies different specialist methods without hardwiring a sunset", () => {
  assert.deepEqual(shaderSkillContext(base).skills.map(skill => skill.id), ["pipeline-engineer"]);
  const cases = [
    ["Reflect the forest in rippling lake water.", "water-optics"],
    ["A comic cel shader with outlines.", "surface-lighting"],
    ["Cool moonlight sky with gentle clouds.", "sky-weather"],
    ["Depth fog and restrained bloom.", "atmosphere-colour"],
  ];
  for (const [prompt, id] of cases) {
    const context = shaderSkillContext({ ...base, prompt });
    assert.ok(context.skills.some(skill => skill.id === id));
    assert.ok(JSON.stringify(context).length <= MAX_SHADER_SKILL_CHARS);
    const used = new Set(context.skills.flatMap(skill => skill.references));
    assert.deepEqual(new Set(context.references.map(reference => reference.id)), used);
  }
});

test("image-only requests get the full skill set within budget; incompatible profiles get no recipes", () => {
  const request = { ...base, prompt: "Make it like this reference.", attachments: [{ name: "look.png", type: "image/png", data: "fixture" }] };
  const context = shaderSkillContext(request);
  assert.equal(context.skills.length, library.skills.length);
  assert.equal(context.references.length, library.references.length);
  assert.ok(JSON.stringify(context).length <= MAX_SHADER_SKILL_CHARS);
  assert.ok(estimateProviderInputTokens(request) > estimateProviderInputTokens(base));
  for (const other of [{ ...base, target: "optifine" as const }, { ...base, version: "26.3" }]) {
    assert.deepEqual(shaderSkillContext(other).skills, []);
    assert.deepEqual(shaderSkillContext(other).references, []);
    assert.match(shaderSkillContext(other).applicability, /withheld/);
  }
});
