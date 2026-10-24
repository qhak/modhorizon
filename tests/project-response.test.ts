import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProjectResponse, projectResponseSchema, projectResponseInstructions, REQUIRED_SHADER_STAGE_PATHS, PROJECT_NAME_PATTERN } from "../src/lib/project-response";
import { validateProject } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

function envelope() {
  const fixture = shaderPackFixture();
  return { name: fixture.name, message: fixture.message,
    requiredFiles: Object.fromEntries(fixture.files.filter(file => (REQUIRED_SHADER_STAGE_PATHS as readonly string[]).includes(file.path)).map(file => [file.path, file.content])),
    files: fixture.files.filter(file => !(REQUIRED_SHADER_STAGE_PATHS as readonly string[]).includes(file.path)),
  };
}

test("shader schema requires all baseline stages as closed object keys rather than arbitrary file-list entries", () => {
  const schema = projectResponseSchema("shader_pack");
  assert.ok(schema.required.includes("requiredFiles"));
  assert.equal(schema.additionalProperties, false);
  const required = schema.properties.requiredFiles!;
  assert.equal(required.additionalProperties, false);
  assert.deepEqual(required.required, [...REQUIRED_SHADER_STAGE_PATHS]);
  for (const path of REQUIRED_SHADER_STAGE_PATHS) {
    assert.equal(required.properties[path].type, "string");
    assert.ok(projectResponseInstructions("shader_pack").includes(path));
  }
  for (const artifact of [undefined, "plugin", "mod", "resource_pack"] as const) {
    assert.ok(!projectResponseSchema(artifact).required.includes("requiredFiles"));
  }
});

test("transport conversion preserves model source exactly, plan order, helper references and existing project format", () => {
  const input = envelope();
  const before = structuredClone(input);
  const normalized = normalizeProjectResponse(input, "shader_pack");
  assert.deepEqual(normalized, shaderPackFixture());
  assert.deepEqual(input, before);
  assert.deepEqual(validateProject(normalized, "shader_pack", "iris", "1.21.11").files, shaderPackFixture().files);
  const classic = shaderPackFixture();
  assert.equal(normalizeProjectResponse(classic, "shader_pack"), classic);
  assert.equal(normalizeProjectResponse(input, "plugin"), input);
});

test("required-stage transport never invents source, resolves duplicate conflicts or bypasses shader validation", () => {
  for (const bad of [undefined, null, "", "  ", 42]) {
    const input = envelope();
    (input.requiredFiles as Record<string, unknown>)[REQUIRED_SHADER_STAGE_PATHS[0]] = bad;
    assert.throws(() => normalizeProjectResponse(input, "shader_pack"), /nonempty generated source.*gbuffers_terrain.vsh/);
  }
  const duplicate = envelope();
  duplicate.files.push({ path: REQUIRED_SHADER_STAGE_PATHS[0], content: "different source" });
  assert.throws(() => normalizeProjectResponse(duplicate, "shader_pack"), /duplicated/);
  const unsafe = envelope();
  unsafe.requiredFiles["../outside"] = "private-source";
  assert.throws(() => normalizeProjectResponse(unsafe, "shader_pack"), /unsupported key/);
  const broken = envelope();
  broken.requiredFiles[REQUIRED_SHADER_STAGE_PATHS[0]] = "not GLSL";
  assert.throws(() => validateProject(normalizeProjectResponse(broken, "shader_pack"), "shader_pack", "iris", "1.21.11"), /#version/);
});

test("shader title normalization changes only the archive label for classic and required-stage responses", () => {
  assert.equal(projectResponseSchema("shader_pack").properties.name.pattern, PROJECT_NAME_PATTERN);
  const cases = [["Golden Hour Water", "Golden-Hour-Water"], ["2026 Sunset!", "Shader-2026-Sunset"],
    ["Café Water", "Cafe-Water"], ["  WarmSky  ", "WarmSky"], ["A".repeat(60), "A".repeat(48)], ["Warm_Sky-2", "Warm_Sky-2"]];
  for (const [name, expected] of cases) {
    for (const input of [{ ...shaderPackFixture(), name }, { ...envelope(), name }]) {
      const before = structuredClone(input);
      const normalized = validateProject(normalizeProjectResponse(input, "shader_pack"), "shader_pack", "iris", "1.21.11");
      assert.equal(normalized.name, expected);
      assert.deepEqual(normalized.files, shaderPackFixture().files);
      assert.deepEqual(input, before);
      assert.equal(normalizeProjectResponse(input, "plugin"), input);
    }
  }
  for (const name of ["", "!!!", "---", "bad\nname", "BadName\n", "A".repeat(201)]) {
    assert.throws(() => validateProject(normalizeProjectResponse({ ...shaderPackFixture(), name }, "shader_pack"), "shader_pack", "iris", "1.21.11"), /Project names must/);
  }
});
