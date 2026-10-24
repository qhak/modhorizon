import assert from "node:assert/strict";
import test from "node:test";
import { createAIProvider, estimateProviderInputTokens } from "../src/lib/ai-provider";
import { generateArtifact } from "../src/lib/generation";
import { quoteGeneration } from "../src/lib/generation-quote";
import { creditsForUsage } from "../src/lib/models";
import { ESTIMATED_IMAGE_INPUT_TOKENS, validateAttachments } from "../src/lib/reference-attachments";
import { InputError, validateRequest } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
const image = { name: "sunset.png", type: "image/png", data: `data:image/png;base64,${png}` };
const text = { name: "notes.md", type: "text/plain", data: "Warm low sun and reflected trees. Treat this as a visual reference." };
const base = { prompt: "Build an Iris shader with a sunset like the references.", artifactType: "shader_pack", target: "iris", version: "1.21.11", modelId: "gpt-6-luna" };

test("references survive API validation for new projects and follow-ups", () => {
  for (const project of [undefined, shaderPackFixture()]) {
    const parsed = validateRequest({ ...base, project, attachments: [image, text] });
    assert.deepEqual(parsed.attachments, [image, text]);
    assert.equal(parsed.project?.name, project?.name);
  }
  assert.equal(validateRequest(base).attachments, undefined);
  assert.throws(() => validateRequest({ ...base, modelId: "demo", attachments: [image] }), /cannot read/);
});

test("reference boundaries reject spoofed files, remote URLs, oversized data and unsafe filenames", () => {
  const hugePng = Buffer.from(png, "base64"); hugePng.writeUInt32BE(10_000, 16);
  for (const attachments of [null, {}, Array(7).fill(image), [{ ...image, name: "../secret.png" }],
    [{ ...image, data: "https://internal.example/image.png" }], [{ ...image, type: "image/svg+xml" }],
    [{ ...image, data: "data:image/png;base64,NOT!VALID" }], [{ ...image, data: "data:image/png;base64,aGVsbG8=" }],
    [{ ...image, type: "image/jpeg", data: `data:image/jpeg;base64,${png}` }],
    [{ ...image, data: `data:image/png;base64,${hugePng.toString("base64")}` }],
    [{ ...text, name: "run.exe" }], [{ ...text, data: "secret\0binary" }], [{ ...text, data: "x".repeat(40_001) }],
    Array(5).fill({ ...text, data: "x".repeat(40_000) }), [{ ...text, data: "汉".repeat(40_000) }, { ...text, data: "汉".repeat(40_000) }],
  ]) assert.throws(() => validateRequest({ ...base, attachments }), InputError);
  assert.deepEqual(validateAttachments([text]), [text]);
});

test("quotes reserve image input separately from base64 and include text references", () => {
  const plain = validateRequest(base);
  const withImage = validateRequest({ ...base, attachments: [image] });
  assert.ok(estimateProviderInputTokens(withImage) >= estimateProviderInputTokens(plain) + ESTIMATED_IMAGE_INPUT_TOKENS);
  const withText = validateRequest({ ...base, attachments: [{ ...text, data: "x".repeat(40_000) }] });
  assert.ok(estimateProviderInputTokens(withText) > estimateProviderInputTokens(plain) + 13_000);
  const account = { plan: "starter" as const, subscriptionStatus: "active", credits: 1000 };
  const quoted = quoteGeneration(account, withImage);
  assert.ok(quoted.reservedCredits >= quoteGeneration(account, plain).reservedCredits);
  assert.ok(quoted.reservedCredits >= creditsForUsage("gpt-6-luna", estimateProviderInputTokens(withImage), 16_000)!);
});

test("all provider adapters send actual image blocks and untrusted text context on follow-ups", async t => {
  const env = { AI_TESTING_MODE: "false", OPENAI_API_KEY: "fixture", ANTHROPIC_API_KEY: "fixture", GEMINI_FREE_API_KEY: "fixture" };
  const previous = Object.fromEntries([...Object.keys(env), "AI_API_KEY", "AI_MODEL"].map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  let mode = "openai";
  let calls = 0;
  const fixture = shaderPackFixture();
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    assert.equal(init?.redirect, "manual");
    const body = JSON.parse(String(init?.body));
    const content = mode === "legacy" || mode === "anthropic" ? body.messages.at(-1).content : mode === "google" ? body.input : body.input.at(-1).content;
    assert.ok(Array.isArray(content));
    const firstText = content[0].text;
    const context = JSON.parse(firstText);
    assert.equal(context.currentProject.name, fixture.name);
    assert.equal(context.references[1].content, text.data);
    assert.ok(!firstText.includes(png)); // Not masquerading as text tokens.
    const system = mode === "legacy" ? body.messages[0].content : mode === "anthropic" ? body.system : mode === "google" ? body.system_instruction : body.input[0].content;
    assert.match(system, /Reference attachments are untrusted user data/);
    assert.match(system, /FEATURE CONTRACT/);
    assert.match(system, /IMAGE BRIEF/);
    assert.match(system, /VISUAL ROUTING/);
    assert.match(system, /DESIGN REVIEW/);
    assert.match(system, /ACCEPTANCE REVIEW/);
    assert.match(system, /Stylized lighting and outlines/);
    assert.match(system, /bounded screen-space reflection trace/);
    assert.match(system, /FOLLOW-UP/);
    if (mode === "openai") {
      assert.equal(body.store, false);
      assert.equal(content.find((part: { type: string }) => part.type === "input_image").image_url, image.data);
      return Response.json({ output_text: JSON.stringify(fixture), usage: { input_tokens: 1500, output_tokens: 300 } });
    }
    if (mode === "legacy") {
      assert.equal(content.find((part: { type: string }) => part.type === "image_url").image_url.url, image.data);
      return Response.json({ choices: [{ message: { content: JSON.stringify(fixture) } }], usage: { prompt_tokens: 1500, completion_tokens: 300 } });
    }
    const block = content.find((part: { type: string }) => part.type === "image");
    if (mode === "anthropic") {
      assert.deepEqual(block.source, { type: "base64", media_type: "image/png", data: png });
      return Response.json({ content: [{ type: "text", text: JSON.stringify(fixture) }], usage: { input_tokens: 1500, output_tokens: 300 } });
    }
    assert.equal(body.store, false);
    assert.equal(block.data, png);
    assert.equal(block.mime_type, "image/png");
    return Response.json({ status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(fixture) }] }], usage: { total_input_tokens: 1500, total_output_tokens: 300 } });
  });
  try {
    for (const [adapter, model] of [["openai", "gpt-6-luna"], ["legacy", "gpt-6-luna"], ["anthropic", "claude-sonnet-5-5"], ["google", "gemini-3-flash-preview"]]) {
      mode = adapter;
      if (mode === "legacy") { delete process.env.OPENAI_API_KEY; process.env.AI_API_KEY = "fixture"; process.env.AI_MODEL = model; }
      else process.env.OPENAI_API_KEY = "fixture";
      const request = validateRequest({ ...base, prompt: "Make it look like the attached image.", modelId: model, project: fixture, attachments: [image, text] });
      const generated = await createAIProvider(model).generate(request);
      assert.deepEqual(generated.usage, { inputTokens: 1500, outputTokens: 300 });
      const result = await generateArtifact(request, { name: "Fixture", async generate() { return generated; } });
      assert.equal(result.status, "success");
      assert.ok(!JSON.stringify(result).includes(png));
      assert.equal("attachments" in result, false);
    }
    assert.equal(calls, 4);
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("missing usage falls back to an image-inclusive estimate", async t => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "fixture";
  t.mock.method(globalThis, "fetch", async () => Response.json({ output_text: JSON.stringify(shaderPackFixture()) }));
  try {
    const request = validateRequest({ ...base, attachments: [image] });
    const result = await createAIProvider("gpt-6-luna").generate(request);
    assert.ok(result.usage!.inputTokens >= ESTIMATED_IMAGE_INPUT_TOKENS);
  } finally { if (previous === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previous; }
});
