import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import source from "../src/lib/shader-foundation-data.json";
import { assembleShaderLook, DEFAULT_LOOK, FOUNDATION_ID, LOOK_CONTROLS, LOOK_SCHEMA, recognizedShaderLook, usesShaderFoundation, validateShaderLook, type ShaderLook } from "../src/lib/shader-adaptation";
import { createAIProvider, estimateProviderInputTokens } from "../src/lib/ai-provider";
import { generateArtifact } from "../src/lib/generation";
import { validateProject, validateRequest } from "../src/lib/validation";

export function lookFixture(): ShaderLook {
  return { name: "GoldenLake", message: "Calmer water with stronger direct light.", goal: "Warm reflective sunset", referenceSummary: "Warm low sun, dark trees and reflected scenery; reflection technique cannot be inferred from the image.", settings: { ...DEFAULT_LOOK }, unfulfilledRequests: ["True volumetric clouds and off-screen reflections are not supported."] };
}
const base = { prompt: "Match the sunset image with reflective water.", artifactType: "shader_pack", target: "iris", version: "1.21.11", modelId: "gpt-6-luna" };

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

test("unknown packages and custom follow-ups retain the full source path", () => {
  const request = validateRequest(base);
  assert.equal(usesShaderFoundation(request), true);
  const original = assembleShaderLook(lookFixture());
  assert.equal(usesShaderFoundation({ ...request, project: original }), true);
  assert.equal(usesShaderFoundation({ ...request, version: "1.21.1" }), false);
  assert.equal(usesShaderFoundation({ ...request, target: "optifine" }), false);
  for (const mutate of [
    (p: typeof original) => { p.files[0].content += "\n// owner edit"; },
    (p: typeof original) => { p.files.pop(); },
    (p: typeof original) => { p.files.push({ path: "shaders/new.glsl", content: "// custom" }); },
    (p: typeof original) => { p.files[0] = p.files[1]; },
    (p: typeof original) => { const plan = p.files.find(file => file.path === "shader-plan.json")!; plan.content = plan.content.replace(FOUNDATION_ID, "future-unknown"); },
  ]) {
    const project = structuredClone(original); mutate(project);
    assert.equal(recognizedShaderLook(project), undefined);
    assert.equal(usesShaderFoundation({ ...request, project }), false);
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

test("all four adapters use one reference-guided look pass, preserve follow-up context, and bill model output only", async t => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
  const image = { name: "sunset.png", type: "image/png", data: `data:image/png;base64,${png}` };
  const env = { AI_TESTING_MODE: "false", OPENAI_API_KEY: "fixture", ANTHROPIC_API_KEY: "fixture", GEMINI_FREE_API_KEY: "fixture" };
  const previous = Object.fromEntries([...Object.keys(env), "AI_API_KEY", "AI_MODEL"].map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  let mode = "openai", calls = 0, bad = false;
  let current = lookFixture(); current.settings.WATER_WAVES = 0.015;
  const original = assembleShaderLook(current);
  let followup = false;
  const output = lookFixture(); output.settings.WATER_WAVES = 0.015; output.settings.EXPOSURE = 1.15;
  const response = () => JSON.stringify(bad ? { ...output, settings: { ...output.settings, EXPOSURE: 999 } } : output);
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const content = mode === "legacy" || mode === "anthropic" ? body.messages.at(-1).content : mode === "google" ? body.input : body.input.at(-1).content;
    const context = JSON.parse(content[0].text);
    assert.equal(context.foundation, FOUNDATION_ID);
    assert.equal(context.currentProject, undefined);
    assert.equal(context.currentLook?.settings.WATER_WAVES, followup ? 0.015 : undefined);
    assert.ok(!content[0].text.includes("#version"));
    assert.equal(content.length, 3);
    const system = mode === "legacy" ? body.messages[0].content : mode === "anthropic" ? body.system : mode === "google" ? body.system_instruction : body.input[0].content;
    assert.match(system, /Never return files or GLSL/);
    assert.match(system, /unfulfilledRequests/);
    assert.match(system, /untrusted user data/);
    if (mode === "openai") {
      assert.deepEqual(body.text.format.schema, LOOK_SCHEMA);
      return Response.json({ output_text: response() });
    }
    if (mode === "legacy") return Response.json({ choices: [{ message: { content: response() } }] });
    if (mode === "anthropic") return Response.json({ content: [{ type: "text", text: response() }] });
    assert.deepEqual(body.response_format.schema, LOOK_SCHEMA);
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: response() }] }] });
  });
  try {
    for (const [adapter, model] of [["openai", "gpt-6-luna"], ["legacy", "gpt-6-luna"], ["anthropic", "claude-sonnet-5-5"], ["google", "gemini-3-flash-preview"]]) {
      mode = adapter;
      if (mode === "legacy") { delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = model; }
      else process.env.OPENAI_API_KEY = "fixture";
      for (const isFollowup of [false, true]) {
        followup = isFollowup;
        const request = validateRequest({ ...base, modelId: model, attachments: [image], ...(followup ? { project: original } : {}) });
        const provider = createAIProvider(model);
        const generated = await provider.generate(request);
        assert.deepEqual(recognizedShaderLook(generated), output);
        assert.equal(generated.usage!.outputTokens, Math.ceil(response().length / 3.5));
        assert.equal(generated.usage!.inputTokens, estimateProviderInputTokens(request));
        assert.ok(generated.usage!.outputTokens < 1000);
        const artifact = await generateArtifact(request, { name: "Fixture", async generate() { return generated; } });
        assert.equal(artifact.status, "success");
        assert.ok(artifact.logs.some(line => line.includes("eight allowed look controls validated")));
      }
    }
    assert.equal(calls, 8);
    mode = "openai"; bad = true; followup = true;
    const request = validateRequest({ ...base, attachments: [image], project: original });
    await assert.rejects(createAIProvider("gpt-6-luna").generate(request), /EXPOSURE/);
    assert.equal(calls, 9, "Invalid specs must not trigger extra paid calls");
    assert.deepEqual(recognizedShaderLook(original), current, "Existing project remains untouched");
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
