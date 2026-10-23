import assert from "node:assert/strict";
import test from "node:test";
import { createAIProvider, estimateProviderInputTokens } from "../src/lib/ai-provider";
import { assembleShaderLook, DEFAULT_LOOK, recognizedShaderLook } from "../src/lib/shader-adaptation";
import { MAX_SHADER_EXAMPLE_CHARS, shaderExampleContext } from "../src/lib/shader-examples";
import { generateArtifact } from "../src/lib/generation";
import { validateRequest } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";
import { ESTIMATED_IMAGE_INPUT_TOKENS } from "../src/lib/reference-attachments";

const base = { prompt: "Create a cel shaded world with crisp colours and cartoon outlines.", artifactType: "shader_pack", target: "iris", version: "1.21.11", modelId: "gpt-6-luna" };
const previousLook = assembleShaderLook({ name: "PreviousLake", message: "Historic look", goal: "Calm lake", referenceSummary: "Warm low sun", settings: DEFAULT_LOOK, unfulfilledRequests: [] });

test("engineering examples are bounded, optional and target-aware across different styles", () => {
  for (const prompt of [base.prompt, "Make calm water with reflected trees.", "Make a custom sunset sky with soft clouds.", "Make bloom and atmospheric haze.", "Lighting shadows sky sunset water bloom haze and cel outlines."] ) {
    const context = shaderExampleContext(validateRequest({ ...base, prompt }));
    assert.ok(JSON.stringify(context).length <= MAX_SHADER_EXAMPLE_CHARS);
    assert.match(context.role, /not required code, palette, architecture or look controls/);
    assert.ok(context.examples.length >= 1);
    for (const example of context.examples) assert.ok(example.dependencies.length > 50);
  }
  const toon = shaderExampleContext(validateRequest(base));
  assert.ok(toon.examples.some(example => example.technique.includes("adapt the light response")));
  assert.ok(!JSON.stringify(toon).includes("vec3 traceScene("));
  const water = shaderExampleContext(validateRequest({ ...base, prompt: "Make calm water with reflected trees." }));
  assert.ok(JSON.stringify(water).includes("vec3 traceScene("));
  for (const change of [{ target: "optifine" }, { version: "1.21.4" }]) {
    const other = shaderExampleContext(validateRequest({ ...base, ...change }));
    assert.deepEqual(other.examples, []);
    assert.match(other.applicability, /Source excerpts withheld/);
  }
});

test("all adapters generate actual GLSL for new shaders and full-source historical follow-ups in one call", async t => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
  const image = { name: "style.png", type: "image/png", data: `data:image/png;base64,${png}` };
  const env = { AI_TESTING_MODE: "false", OPENAI_API_KEY: "fixture", ANTHROPIC_API_KEY: "fixture", GEMINI_FREE_API_KEY: "fixture" };
  const previous = Object.fromEntries([...Object.keys(env), "AI_API_KEY", "AI_MODEL"].map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  const output = shaderPackFixture();
  output.name = "CustomBands";
  const terrain = output.files.find(file => file.path.endsWith("terrain.fsh"))!;
  terrain.content = terrain.content.replace("color.rgb *= texture(lightmap, lmcoord).rgb;", "color.rgb *= texture(lightmap, lmcoord).rgb;\n  color.rgb = floor(color.rgb * 5.0) / 5.0;");
  let mode = "openai", calls = 0, followup = false, bad = false, capturedEstimate = 0;
  const response = () => JSON.stringify(bad ? { name: "SettingsOnly", settings: DEFAULT_LOOK, message: "Not source" } : output);
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const content = mode === "legacy" || mode === "anthropic" ? body.messages.at(-1).content : mode === "google" ? body.input : body.input.at(-1).content;
    const context = JSON.parse(content[0].text);
    assert.deepEqual(context.currentProject?.files, followup ? previousLook.files : undefined);
    assert.equal(context.foundation, undefined);
    assert.equal(context.currentLook, undefined);
    assert.deepEqual(context.shaderEngineeringExamples, shaderExampleContext(validateRequest(base)));
    const system = mode === "legacy" ? body.messages[0].content : mode === "anthropic" ? body.system : mode === "google" ? body.system_instruction : body.input[0].content;
    assert.match(system, /SOURCE GENERATION/);
    assert.match(system, /not limited to AuroraHorizon/);
    assert.doesNotMatch(system, /Never return files or GLSL/);
    assert.match(system, /FEATURE CONTRACT/);
    assert.match(system, /IMAGE BRIEF/);
    if (followup) assert.match(system, /Historical foundation projects are now fully editable/);
    assert.equal(content.length, 3, "Real image block must remain present");
    const schema = mode === "openai" ? body.text.format.schema : mode === "google" ? body.response_format.schema : undefined;
    if (schema) {
      assert.ok(schema.properties.files); assert.equal(schema.properties.settings, undefined);
      capturedEstimate = Math.ceil((system.length + content[0].text.length + JSON.stringify(schema).length) / 3) + ESTIMATED_IMAGE_INPUT_TOKENS;
    }
    if (mode === "openai") return Response.json({ output_text: response() });
    if (mode === "legacy") return Response.json({ choices: [{ message: { content: response() } }] });
    if (mode === "anthropic") return Response.json({ content: [{ type: "text", text: response() }] });
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: response() }] }] });
  });
  try {
    for (const [adapter, model] of [["openai", "gpt-6-luna"], ["legacy", "gpt-6-luna"], ["anthropic", "claude-sonnet-5-5"], ["google", "gemini-3-flash-preview"]]) {
      mode = adapter;
      if (mode === "legacy") { delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = model; }
      else process.env.OPENAI_API_KEY = "fixture";
      for (const isFollowup of [false, true]) {
        followup = isFollowup;
        const request = validateRequest({ ...base, modelId: model, attachments: [image], ...(followup ? { project: previousLook } : {}) });
        const generated = await createAIProvider(model).generate(request);
        assert.deepEqual(generated.files, output.files, "Provider source must not be swapped for a preset");
        assert.equal(recognizedShaderLook(generated), undefined);
        assert.equal(generated.usage!.outputTokens, Math.ceil(response().length / 3.5));
        assert.equal(generated.usage!.inputTokens, estimateProviderInputTokens(request));
        if (adapter === "openai" || adapter === "google") assert.equal(estimateProviderInputTokens(request), capturedEstimate, "Quote estimate must cover the captured system, complete source/examples, schema and image input");
        const artifact = await generateArtifact(request, { name: "Fixture", async generate() { return generated; } });
        assert.equal(artifact.status, "success");
        assert.ok(artifact.logs.some(line => line.includes("Generating complete shader source")));
        assert.ok(!artifact.logs.some(line => line.includes("eight allowed look controls validated")));
      }
    }
    assert.equal(calls, 8);
    mode = "openai"; bad = true; followup = true;
    await assert.rejects(createAIProvider("gpt-6-luna").generate(validateRequest({ ...base, project: previousLook, attachments: [image] })), /source files/);
    assert.equal(calls, 9, "Invalid settings-only output must not cause an extra call or preset fallback");
    bad = false;
    terrain.content = "#version 120\n/* DRAWBUFFERS:0 */\nvoid main(){ gl_FragData[4] = vec4(1.0); }";
    await assert.rejects(createAIProvider("gpt-6-luna").generate(validateRequest({ ...base, project: previousLook, attachments: [image] })), /output slot/);
    assert.equal(calls, 10, "Static source failure must not cause hidden repairs or extra paid calls");
    assert.ok(recognizedShaderLook(previousLook), "Original project remains unchanged");
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
