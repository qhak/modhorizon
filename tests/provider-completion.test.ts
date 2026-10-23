import assert from "node:assert/strict";
import test from "node:test";
import { createAIProvider, estimateProviderInputTokens } from "../src/lib/ai-provider";
import { quoteGeneration } from "../src/lib/generation-quote";
import { creditsForUsage, generationOutputTokenLimit, reserveCreditsForGeneration } from "../src/lib/models";
import { validateRequest } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

const request = validateRequest({ prompt: "Create realistic water and sunlight.", artifactType: "shader_pack", target: "iris", version: "1.21.11", modelId: "gpt-6-luna" });
const text = JSON.stringify(shaderPackFixture());
function configure() {
  const values = { AI_TESTING_MODE: "false", OPENAI_API_KEY: "fixture", ANTHROPIC_API_KEY: "fixture", GEMINI_FREE_API_KEY: "fixture" };
  const old = Object.fromEntries([...Object.keys(values), "AI_API_KEY", "AI_MODEL"].map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => { for (const [key, value] of Object.entries(old)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
}

test("all adapters accept larger shader envelopes while enforcing transport and source bounds independently", async t => {
  const restore = configure(); let mode = "openai", oversized = false, calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    calls++;
    const padding = "x".repeat(oversized ? 2_000_001 : 500_000);
    if (mode === "legacy") return Response.json({ padding, choices: [{ message: { content: text } }] });
    if (mode === "anthropic") return Response.json({ padding, content: [{ type: "text", text }] });
    if (mode === "google") return Response.json({ padding, status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text }] }] });
    return Response.json({ padding, status: "completed", output_text: text });
  });
  try {
    for (const [adapter, model] of [["openai", "gpt-6-luna"], ["legacy", "gpt-6-luna"], ["anthropic", "claude-sonnet-5-5"], ["google", "gemini-3-flash-preview"]]) {
      mode = adapter; oversized = false;
      if (mode === "legacy") { delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = model; }
      else process.env.OPENAI_API_KEY = "fixture";
      const provider = createAIProvider(model);
      const result = await provider.generate({ ...request, modelId: model });
      assert.deepEqual(result.files, shaderPackFixture().files);
      oversized = true;
      await assert.rejects(provider.generate({ ...request, modelId: model }), /AI provider response exceeded the 2,000,000-byte transport limit/);
    }
    mode = "openai"; oversized = false; process.env.OPENAI_API_KEY = "fixture";
    await assert.rejects(createAIProvider("gpt-6-luna").generate({ ...request, artifactType: "plugin", target: "paper" }), /400,000-byte transport limit/);
    assert.equal(calls, 9, "Transport failures do not trigger hidden retries");
  } finally { restore(); }
});

test("all adapters receive targeted compiler repair guidance and exact source with matching input estimates", async t => {
  const restore = configure(); let mode = "openai", calls = 0;
  const errors = ['Program: gbuffers_terrain', 'declaration of "gbufferModelViewInverse" conflicts with previous declaration'];
  let expectedInput = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    const user = mode === "legacy" || mode === "anthropic" ? body.messages.at(-1).content : mode === "google" ? body.input : body.input.at(-1).content;
    const payload = JSON.parse(user);
    assert.deepEqual(payload.currentProject.files, shaderPackFixture().files);
    assert.deepEqual(payload.compilationErrors, errors);
    assert.match(payload.shaderCompilerRepair.objective, /smallest coherent source changes/);
    assert.match(payload.shaderCompilerRepair.checklist.join(" "), /Different include guards do not prevent duplicate declarations/);
    if (mode === "openai") {
      assert.equal(expectedInput, Math.ceil((body.input[0].content.length + user.length + JSON.stringify(body.text.format.schema).length) / 3));
    }
    if (mode === "legacy") return Response.json({ choices: [{ message: { content: text } }] });
    if (mode === "anthropic") return Response.json({ content: [{ type: "text", text }] });
    if (mode === "google") return Response.json({ steps: [{ type: "model_output", content: [{ type: "text", text }] }] });
    return Response.json({ output_text: text });
  });
  try {
    for (const [adapter, model] of [["openai", "gpt-6-luna"], ["legacy", "gpt-6-luna"], ["anthropic", "claude-sonnet-5-5"], ["google", "gemini-3-flash-preview"]]) {
      mode = adapter;
      if (mode === "legacy") { delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = model; }
      else process.env.OPENAI_API_KEY = "fixture";
      const input = { ...request, modelId: model, project: shaderPackFixture() };
      expectedInput = estimateProviderInputTokens(input, errors);
      assert.deepEqual((await createAIProvider(model).generate(input, errors)).files, shaderPackFixture().files);
    }
    assert.equal(calls, 4);
  } finally { restore(); }
});

test("OpenAI completion status precedes parsing and text blocks are assembled in order", async t => {
  const restore = configure(); let payload: unknown; let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json(payload); });
  try {
    const provider = createAIProvider("gpt-6-luna");
    for (const badText of [text, '{"name":"Unfinished"']) {
      payload = { status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output_text: badText };
      await assert.rejects(provider.generate(request), /32,000-token output budget.*No automatic retry/);
    }
    payload = { status: "completed", output_text: text, output: [{ type: "message", content: [{ type: "refusal", refusal: "private provider text" }] }] };
    await assert.rejects(provider.generate(request), /declined or filtered/);
    payload = { status: "incomplete", incomplete_details: { reason: "content_filter" }, output_text: text };
    await assert.rejects(provider.generate(request), /declined or filtered/);
    payload = { status: "failed", output_text: text };
    await assert.rejects(provider.generate(request), /did not complete/);
    payload = { status: "completed", output: [
      { type: "reasoning", content: [{ type: "output_text", text: "IGNORE" }] },
      { type: "message", content: [{ type: "output_text", text: text.slice(0, 123) }, { type: "tool_output", text: "IGNORE" }] },
      { type: "message", content: [{ type: "output_text", text: text.slice(123) }] },
    ], usage: { input_tokens: 1234, output_tokens: 5678 } };
    const result = await provider.generate(request);
    assert.deepEqual(result.files, shaderPackFixture().files);
    assert.deepEqual(result.usage, { inputTokens: 1234, outputTokens: 5678 });
    assert.equal(calls, 6, "No hidden retries");
  } finally { restore(); }
});

test("empty, malformed JSON and valid JSON with bad source produce different safe diagnostics", async t => {
  const restore = configure(); let payload: unknown;
  t.mock.method(globalThis, "fetch", async () => Response.json(payload));
  t.mock.method(console, "warn", () => undefined);
  try {
    const provider = createAIProvider("gpt-6-luna");
    payload = { status: "completed", output_text: " " };
    await assert.rejects(provider.generate(request), /no project text/);
    payload = { status: "completed", output_text: '{"secret-source-marker":"raw\ninvalid"}' };
    await assert.rejects(provider.generate(request), error => error instanceof Error && /malformed or incomplete project JSON/.test(error.message) && !error.message.includes("secret-source-marker") && !error.message.includes("raw"));
    payload = { status: "completed", output_text: JSON.stringify({ name: "Unsafe", files: [{ path: "../private.glsl", content: "private-source" }] }) };
    await assert.rejects(provider.generate(request), /Shader pack structure check failed: Unsupported shader pack file path/);
    payload = { status: "completed", output_text: text + "x".repeat(2_000_001) };
    await assert.rejects(provider.generate(request), /AI provider response exceeded the 2,000,000-byte transport limit/);
    const tooLarge = shaderPackFixture();
    tooLarge.files.push({ path: "shaders/lib/large.glsl", content: "x".repeat(80_001) });
    payload = { status: "completed", output_text: JSON.stringify(tooLarge) };
    await assert.rejects(provider.generate(request), /Shader pack structure check failed: Source files must be text/);
  } finally { restore(); }
});

test("legacy OpenAI, Anthropic and Gemini reject incomplete results even with valid project text", async t => {
  const restore = configure(); let payload: unknown; let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; return Response.json(payload); });
  try {
    delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = "gpt-6-luna";
    payload = { choices: [{ finish_reason: "length", message: { content: text } }] };
    await assert.rejects(createAIProvider("gpt-6-luna").generate(request), /32,000-token output budget/);
    payload = { choices: [{ finish_reason: "content_filter", message: { content: text } }] };
    await assert.rejects(createAIProvider("gpt-6-luna").generate(request), /declined or filtered/);
    payload = { stop_reason: "max_tokens", content: [{ type: "text", text }] };
    await assert.rejects(createAIProvider("claude-sonnet-5-5").generate({ ...request, modelId: "claude-sonnet-5-5" }), /32,000-token output budget/);
    payload = { stop_reason: "refusal", content: [{ type: "text", text }] };
    await assert.rejects(createAIProvider("claude-sonnet-5-5").generate({ ...request, modelId: "claude-sonnet-5-5" }), /declined or filtered/);
    payload = { status: "incomplete", steps: [{ type: "model_output", content: [{ type: "text", text }] }] };
    await assert.rejects(createAIProvider("gemini-3-flash-preview").generate({ ...request, modelId: "gemini-3-flash-preview" }), /incomplete project.*No automatic retry/);
    assert.equal(calls, 5);
  } finally { restore(); }
});

test("provider envelope failures hide raw text and enforce the response limit in bytes", async t => {
  const restore = configure(); let mode = "malformed"; let invalidShape: unknown = [];
  t.mock.method(globalThis, "fetch", async () => mode === "malformed"
    ? new Response('{"private-provider-marker":"bad\njson"}')
    : mode === "shape" ? Response.json(invalidShape)
    : Response.json({ status: "completed", output_text: text, padding: "é".repeat(1_010_000) }));
  try {
    const provider = createAIProvider("gpt-6-luna");
    await assert.rejects(provider.generate(request), error => error instanceof Error && /invalid JSON response envelope/.test(error.message) && !error.message.includes("private-provider-marker"));
    mode = "shape";
    for (const shape of [[], { output: {} }, { output: [null] }, { output: [{ content: {} }] }]) {
      invalidShape = shape;
      await assert.rejects(provider.generate(request), /unsupported response envelope/);
    }
    mode = "bytes";
    await assert.rejects(provider.generate(request), /AI provider response exceeded the 2,000,000-byte transport limit/);
  } finally { restore(); }
});

test("every adapter uses the same artifact output ceiling as credit quotes and reservations", async t => {
  const restore = configure(); let expectedLimit = 0, mode = "openai", calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens ?? body.max_output_tokens ?? body.generation_config?.max_output_tokens, expectedLimit);
    if (mode === "legacy") return Response.json({ choices: [{ finish_reason: "length", message: { content: text } }] });
    if (mode === "anthropic") return Response.json({ stop_reason: "max_tokens", content: [{ type: "text", text }] });
    if (mode === "google") return Response.json({ status: "incomplete" });
    return Response.json({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" } });
  });
  try {
    for (const artifactType of [undefined, "plugin", "resource_pack", "shader_pack"] as const) {
      expectedLimit = artifactType === "shader_pack" ? 32_000 : 16_000;
      assert.equal(generationOutputTokenLimit(artifactType), expectedLimit);
      for (const [adapter, model] of [["openai", "gpt-6-luna"], ["legacy", "gpt-6-luna"], ["anthropic", "claude-sonnet-5-5"], ["google", "gemini-3-flash-preview"]]) {
        mode = adapter;
        if (mode === "legacy") { delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = model; }
        else process.env.OPENAI_API_KEY = "fixture";
        const input = { ...request, artifactType, modelId: model };
        const quote = quoteGeneration({ plan: "starter", subscriptionStatus: "active", credits: 1000 }, input);
        const estimatedInput = estimateProviderInputTokens(input);
        assert.equal(quote.reservedCredits, reserveCreditsForGeneration(model, estimatedInput, input.reasoningEffort, artifactType));
        assert.ok(quote.reservedCredits >= creditsForUsage(model, estimatedInput, expectedLimit)!);
        await assert.rejects(createAIProvider(model).generate(input), /output budget|incomplete project/);
      }
    }
    assert.equal(calls, 16);
  } finally { restore(); }
});
