import assert from "node:assert/strict";
import test from "node:test";
import { createAIProvider } from "../src/lib/ai-provider";
import { BillingError } from "../src/lib/billing-errors";
import { generateArtifact } from "../src/lib/generation";
import { MockProvider } from "../src/lib/mock-provider";
import { getArtifact } from "../src/lib/project-store";
import { validateRequest } from "../src/lib/validation";

test("pack generation retains reasoning, billable provider usage and chat replies", async () => {
  const input = validateRequest({
    prompt: "Create a shader pack with warm sunset colors.",
    artifactType: "shader_pack", target: "iris", version: "1.21.4",
    modelId: "gpt-6-luna", reasoningEffort: "low",
  });
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-credential";
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.reasoning.effort, "low");
    assert.match(body.input[0].content, /shader/i);
    assert.equal(JSON.parse(body.input[1].content).target, "iris");
    return Response.json({
      output_text: JSON.stringify({ name: "WarmSky", message: "/reference shaders/world.fsh", files: [
        { path: "shaders/world.vsh", content: "#version 120\nvoid main() { gl_Position = ftransform(); }" },
        { path: "shaders/world.fsh", content: "#version 120\nvoid main() { gl_FragColor = vec4(1.0); }" },
      ] }),
      usage: { input_tokens: 120, output_tokens: 240 },
    });
  };
  try {
    const provider = createAIProvider("gpt-6-luna");
    const project = await generateArtifact(input, {
      name: provider.name,
      async generate(request, errors) {
        const result = await provider.generate(request, errors);
        assert.deepEqual(result.usage, { inputTokens: 120, outputTokens: 240 });
        return result;
      },
    });
    assert.equal(calls, 1);
    assert.equal(project.status, "success");
    assert.equal(project.message, "/reference shaders/world.fsh");
    assert.equal(project.target, "iris");
    assert.equal(project.artifactAvailable, true);
    assert.ok(getArtifact(project.id));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("billing denial on repair preserves generated source without a fake artifact", async () => {
  const input = validateRequest({
    prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.",
    version: "1.21.4", target: "paper", modelId: "demo",
  });
  const fixture = await new MockProvider().generate(input);
  let passes = 0;
  const project = await generateArtifact(input, {
    name: "Metered example",
    async generate() {
      if (passes++) throw new BillingError("Insufficient credits.", 402);
      return fixture;
    },
  }, { async build() { return { success: false, logs: ["Needs repair"] }; } });
  assert.equal(passes, 2);
  assert.equal(project.status, "preview");
  assert.deepEqual(project.files, fixture.files);
  assert.equal(project.artifactAvailable, false);
  assert.match(project.error!, /Insufficient credits/);
});

test("legacy platform requests and redesigned artifact targets share validation", () => {
  const legacy = validateRequest({ prompt: "Make a Fabric mod that adds ruby ore.", platform: "fabric", version: "1.21.4" });
  assert.equal(legacy.artifactType, "mod");
  assert.equal(legacy.target, "fabric");
  const pack = validateRequest({ prompt: "Make a resource pack with new item names.", artifactType: "resource_pack", target: "vanilla", version: "1.21.4", reasoningEffort: "low" });
  assert.equal(pack.reasoningEffort, "low");
  assert.equal(pack.artifactType, "resource_pack");
  assert.throws(() => validateRequest({ ...pack, target: "paper" }));
});
