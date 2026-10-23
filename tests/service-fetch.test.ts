import assert from "node:assert/strict";
import test from "node:test";
import { serviceFetch } from "../src/lib/service-fetch";
import { createAIProvider } from "../src/lib/ai-provider";
import { RemoteBuildService } from "../src/lib/build-service";
import { MockProvider } from "../src/lib/mock-provider";
import type { GenerateRequest } from "../src/lib/types";

const request: GenerateRequest = { prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", artifactType: "plugin", target: "paper", version: "1.21.4", reasoningEffort: "medium" };

test("service requests use Workers-compatible manual mode and preserve normal responses", async t => {
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    assert.equal(init?.redirect, "manual");
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer fixture");
    return Response.json({ ok: true });
  });
  const result = await serviceFetch("https://service.example", { redirect: "error", headers: { Authorization: "Bearer fixture" } });
  assert.deepEqual(await result.json(), { ok: true });
});

test("AI providers and builder reject redirects without sending credentials to another destination", async t => {
  const values = { AI_TESTING_MODE: "false", OPENAI_API_KEY: "fixture", ANTHROPIC_API_KEY: "fixture", GEMINI_FREE_API_KEY: "fixture", BUILD_SERVICE_URL: "https://builder.example/build", BUILD_SERVICE_TOKEN: "fixture" };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  try {
    const fixture = await new MockProvider().generate(request);
    for (const status of [301, 302, 307, 308]) {
      let calls = 0;
      const mocked = t.mock.method(globalThis, "fetch", async (url: unknown, init?: RequestInit) => {
        calls++;
        assert.equal(init?.redirect, "manual");
        assert.doesNotMatch(String(url), /redirect-target/);
        return new Response(null, { status, headers: { Location: "https://redirect-target.example" } });
      });
      for (const model of ["gpt-6-luna", "claude-sonnet-5-5", "gemini-3-flash-preview"])
        await assert.rejects(createAIProvider(model).generate(request), /unexpected redirect/);
      await assert.rejects(new RemoteBuildService().build(fixture, request), /unexpected redirect/);
      assert.equal(calls, 4);
      mocked.mock.restore();
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test("shader requests get four minutes across providers, retain other deadlines and never auto-retry timeouts", async t => {
  const values = { AI_TESTING_MODE: "false", OPENAI_API_KEY: "fixture", ANTHROPIC_API_KEY: "fixture", GEMINI_FREE_API_KEY: "fixture" };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  const deadlines: number[] = [];
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    deadlines.push(milliseconds);
    return new AbortController().signal;
  });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    calls++;
    assert.ok(init?.signal);
    assert.equal(init?.redirect, "manual");
    throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
  });
  try {
    for (const [model, normalDeadline] of [["gpt-6-luna", 90_000], ["claude-sonnet-5-5", 90_000], ["gemini-3-flash-preview", 180_000]] as const) {
      const provider = createAIProvider(model);
      await assert.rejects(provider.generate({ ...request, artifactType: "shader_pack", target: "iris" }), /timed out after 240 seconds.*No completed project/);
      assert.equal(deadlines.at(-1), 240_000);
      await assert.rejects(provider.generate(request), new RegExp(`timed out after ${normalDeadline / 1000} seconds`));
      assert.equal(deadlines.at(-1), normalDeadline);
    }
    assert.equal(calls, 6);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
