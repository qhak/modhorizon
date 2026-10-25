import assert from "node:assert/strict";
import test from "node:test";
import { generateArtifact } from "../src/lib/generation";
import { validateRequest } from "../src/lib/validation";
import { shaderCompilerConfigured, createShaderCompiler } from "../src/lib/shader-compiler";
import { quoteGeneration, assertShaderRepairBudget } from "../src/lib/generation-quote";
import { BillingError } from "../src/lib/billing-errors";
import { shaderCompilerServer } from "../scripts/shaders/compiler-server";
import { shaderPackFixture } from "./fixtures/shader-pack";

const request = validateRequest({ prompt: "Create a sunset shader with reflected water.", artifactType: "shader_pack", target: "iris", version: "1.21.11", modelId: "gpt-6-luna" });
const fail = { success: false, logs: ["gbuffers_water.fsh: undefined mhApplyLighting"] };
const pass = { success: true, logs: ["Compiled 4 stages; linked 2 programs; 0 failed programs."] };

test("compiler transport accepts escaped diagnostic output and names its own size limit", async t => {
  const previous = { NODE_ENV: process.env.NODE_ENV, SHADER_COMPILER_TOKEN: process.env.SHADER_COMPILER_TOKEN, SHADER_COMPILER_URL: process.env.SHADER_COMPILER_URL };
  Object.assign(process.env, { NODE_ENV: "development", SHADER_COMPILER_TOKEN: "fixture", SHADER_COMPILER_URL: "http://127.0.0.1:3231/check" });
  let oversized = false;
  // Escaped JSON can exceed raw driver output size; the source reader's limit is separate.
  const logs = Array(40).fill("\\".repeat(1800));
  t.mock.method(globalThis, "fetch", async () => oversized ? new Response(" ".repeat(600_001)) : Response.json({ success: false, logs }));
  try {
    const compiler = createShaderCompiler()!;
    assert.deepEqual((await compiler.check(shaderPackFixture())).logs, logs);
    oversized = true;
    await assert.rejects(compiler.check(shaderPackFixture()), /Local shader compiler response exceeded the 600,000-byte diagnostic limit/);
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("compiler failure blocks ZIPs, with opt-in at most one repair and recheck", async () => {
  for (const budget of [0, 10]) for (const repaired of [false, true]) {
    let calls = 0, checks = 0;
    const project = await generateArtifact({ ...request, shaderRepairCredits: budget }, {
      name: "fixture", async generate(input, errors) {
        calls++;
        if (calls === 2) { assert.deepEqual(errors, fail.logs); assert.deepEqual(input.project?.files, shaderPackFixture().files); }
        return shaderPackFixture();
      },
    }, undefined, { async check() { checks++; return checks === 2 && repaired ? pass : fail; } });
    assert.equal(calls, budget ? 2 : 1); assert.equal(checks, calls);
    assert.equal(project.status, budget && repaired ? "success" : "failed");
    assert.equal(project.artifactAvailable, Boolean(budget && repaired));
    assert.ok(project.files.length); assert.ok(project.logs.includes(fail.logs[0]));
  }
});

test("passing source needs no paid repair; compiler outages never trigger repair", async () => {
  for (const outage of [false, true]) {
    let calls = 0;
    const project = await generateArtifact({ ...request, shaderRepairCredits: 10 }, { name: "fixture", async generate() { calls++; return shaderPackFixture(); } }, undefined,
      { async check() { if (outage) throw new Error("Compiler offline"); return pass; } });
    assert.equal(calls, 1); assert.equal(project.status, outage ? "failed" : "success"); assert.ok(project.files.length);
  }
});

test("repair budget is explicit, validated, quoted, and enforced before a provider call", async () => {
  for (const value of [-1, 1.5, 1001, "10", true]) assert.throws(() => validateRequest({ ...request, shaderRepairCredits: value }));
  assert.equal(validateRequest(request).shaderRepairCredits, 0);
  assert.throws(() => assertShaderRepairBudget(request, 1, fail.logs), BillingError);
  assert.throws(() => assertShaderRepairBudget({ ...request, shaderRepairCredits: 10 }, 11, fail.logs), BillingError);
  assert.doesNotThrow(() => assertShaderRepairBudget({ ...request, shaderRepairCredits: 10 }, 10, fail.logs));
  const quote = quoteGeneration({ plan: "free", subscriptionStatus: "none", credits: 100 }, { ...request, shaderRepairCredits: 10 });
  assert.equal(quote.maximumAuthorizedCredits, quote.reservedCredits + 10);
  let calls = 0;
  const project = await generateArtifact({ ...request, shaderRepairCredits: 1 }, { name: "fixture", async generate(input, errors) {
    if (errors) assertShaderRepairBudget(input, 2, errors);
    calls++; return shaderPackFixture();
  } }, undefined, { async check() { return fail; } });
  assert.equal(calls, 1); assert.equal(project.status, "failed"); assert.equal(project.artifactAvailable, false); assert.ok(project.files.length);
});

test("compiler config cannot send source or credentials outside development loopback", () => {
  assert.equal(createShaderCompiler(), undefined);
  for (const NODE_ENV of ["production", "test", "development"] as const) {
    assert.equal(shaderCompilerConfigured({ NODE_ENV, SHADER_COMPILER_TOKEN: "token", SHADER_COMPILER_URL: "https://example.com/check" }), false);
    assert.equal(shaderCompilerConfigured({ NODE_ENV, SHADER_COMPILER_TOKEN: "token", SHADER_COMPILER_URL: "http://127.0.0.1:3231/check" }), NODE_ENV === "development");
  }
});

test("local compiler rejects unauthenticated, browser, oversized and traversal requests", async () => {
  let calls = 0;
  const token = "x".repeat(64);
  const server = shaderCompilerServer(token, async () => { calls++; return pass; }, "unused");
  await new Promise<void>(accept => server.listen(0, "127.0.0.1", accept));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/check`;
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  try {
    assert.equal((await fetch(url, { method: "POST", headers: { ...headers, Authorization: "bad" }, body: "{}" })).status, 401);
    assert.equal((await fetch(url, { method: "POST", headers: { ...headers, Origin: "http://127.0.0.1:3215" }, body: "{}" })).status, 403);
    assert.equal((await fetch(url, { method: "POST", headers, body: " ".repeat(200001) })).status, 413);
    assert.equal((await fetch(url, { method: "POST", headers, body: JSON.stringify({ name: "Bad", files: [{ path: "../evil.fsh", content: "bad" }] }) })).status, 400);
    assert.equal(calls, 0);
    const response = await fetch(url, { method: "POST", headers, body: JSON.stringify(shaderPackFixture()) });
    assert.equal(response.status, 200); assert.deepEqual(await response.json(), pass); assert.equal(calls, 1);
  } finally { await new Promise<void>((accept, reject) => server.close(error => error ? reject(error) : accept())); }
});
