import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import source from "../src/lib/shader-foundation-data.json";
import { assembleShaderLook, DEFAULT_LOOK, FOUNDATION_ID, LOOK_CONTROLS, recognizedShaderLook, validateShaderLook, type ShaderLook } from "../src/lib/shader-adaptation";
import { validateProject } from "../src/lib/validation";

export function lookFixture(): ShaderLook {
  return { name: "GoldenLake", message: "Calmer water with stronger direct light.", goal: "Warm reflective sunset", referenceSummary: "Warm low sun, dark trees and reflected scenery; reflection technique cannot be inferred from the image.", settings: { ...DEFAULT_LOOK }, unfulfilledRequests: ["True volumetric clouds and off-screen reflections are not supported."] };
}

test("runtime snapshot exactly matches the authored renderer and validated output remains recognizable", () => {
  assert.equal(source.length, 30);
  for (const file of source) assert.equal(file.content, readFileSync(join("shader-foundations/aurora-horizon", file.path), "utf8").replaceAll("\r\n", "\n"));
  const generated = assembleShaderLook(lookFixture());
  const validated = validateProject(generated, "shader_pack", "iris", "1.21.11");
  assert.deepEqual(recognizedShaderLook(validated), lookFixture());
  assert.deepEqual(validated.shaderReport!.features.flatMap(item => item.warnings || []), []);
  assert.match(validated.message!, /terrain material response is experimental/);
  assert.match(validated.shaderReport!.unfulfilledRequests![0], /off-screen reflections are not supported/);
  const result = JSON.parse(validated.files.find(file => file.path === "shader-plan.json")!.content);
  assert.equal(result.foundationAdaptation.id, FOUNDATION_ID);
});

test("maximum accepted prose passes the full report contract and retains the final unmet request", () => {
  const look = lookFixture();
  look.goal = "g".repeat(500); look.referenceSummary = "r".repeat(900); look.message = "m".repeat(500);
  look.unfulfilledRequests = Array.from({ length: 12 }, (_, index) => `${index}:` + "u".repeat(496));
  const result = validateProject(assembleShaderLook(look), "shader_pack", "iris", "1.21.11");
  assert.equal(result.shaderReport!.unfulfilledRequests!.at(-1), look.unfulfilledRequests.at(-1));
  assert.match(result.message!, /unmet requests: 12/);
  assert.ok(result.message!.endsWith(look.message));
  assert.deepEqual(recognizedShaderLook(result), look);
});

test("every supported numeric setting preserves immutable renderer files and canonical recognition", () => {
  for (const [control, values] of Object.entries(LOOK_CONTROLS)) for (const value of values) {
    const look = lookFixture(); look.settings[control as keyof typeof LOOK_CONTROLS] = value;
    const project = assembleShaderLook(look);
    assert.deepEqual(recognizedShaderLook(project), look);
    for (const file of source.filter(file => !["README.md", "shader-plan.json", "shaders/lib/common.glsl"].includes(file.path)))
      assert.equal(project.files.find(item => item.path === file.path)!.content, file.content);
    assert.match(project.files.find(file => file.path === "shaders/lib/common.glsl")!.content, new RegExp(`#define ${control} ${Number.isInteger(value) ? value.toFixed(1).replace(".", "\\.") : String(value).replace(".", "\\.")} //`));
  }
});

test("historical recognition rejects unknown or modified packages", () => {
  const original = assembleShaderLook(lookFixture());
  for (const mutate of [
    (p: typeof original) => { p.files[0].content += "\n// owner edit"; },
    (p: typeof original) => { p.files.pop(); },
    (p: typeof original) => { p.files.push({ path: "shaders/new.glsl", content: "// custom" }); },
    (p: typeof original) => { p.files[0] = p.files[1]; },
    (p: typeof original) => { const plan = p.files.find(file => file.path === "shader-plan.json")!; plan.content = plan.content.replace(FOUNDATION_ID, "future-unknown"); },
  ]) {
    const project = structuredClone(original); mutate(project);
    assert.equal(recognizedShaderLook(project), undefined);
  }
});

test("look validator rejects unknown fields, unsupported numbers, raw files and oversized prose", () => {
  for (const value of [NaN, Infinity, "1.05", null, 42]) {
    const look: any = lookFixture(); look.settings.EXPOSURE = value;
    assert.throws(() => validateShaderLook(look), /allowed numeric/);
  }
  const invalid: any[] = [
    { ...lookFixture(), files: [] }, { ...lookFixture(), name: "../oops" },
    { ...lookFixture(), goal: "x".repeat(1501) }, { ...lookFixture(), message: "a\nb" },
    { ...lookFixture(), unfulfilledRequests: Array(13).fill("unsupported") },
    { ...lookFixture(), settings: { ...DEFAULT_LOOK, BUFFER_FORMAT: 4 } },
    { ...lookFixture(), settings: {} },
  ];
  for (const look of invalid) assert.throws(() => validateShaderLook(look));
  const hostile = lookFixture(); hostile.referenceSummary = "``` #define BAD 9";
  const generated = assembleShaderLook(hostile);
  assert.ok(!generated.files.filter(file => file.path.endsWith(".glsl")).some(file => file.content.includes("BAD")));
  assert.ok(generated.files.find(file => file.path === "README.md")!.content.includes("\\u0060"));
});
