import assert from "node:assert/strict";
import test from "node:test";
import { generatePlugin } from "../src/lib/generation";
import { MockProvider } from "../src/lib/mock-provider";
import { getArtifact } from "../src/lib/project-store";
import { validateProject, validateRequest } from "../src/lib/validation";
import { RemoteBuildService } from "../src/lib/build-service";
import type {
  AIProvider,
  BuildService,
  GenerateRequest,
} from "../src/lib/types";
import {
  createAIProvider,
  limitedJson,
  trustedEndpoint,
} from "../src/lib/ai-provider";
import { hasAllowedOrigin } from "../src/lib/request-origin";

const request: GenerateRequest = {
  prompt:
    "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.",
  artifactType: "plugin",
  target: "paper",
  version: "1.21.4",
};

test("origin checks use actual Host despite Next loopback URL normalization", () => {
  const allowed = (url: string, host: string, origin?: string) =>
    hasAllowedOrigin(
      new Request(url, {
        headers: { host, ...(origin === undefined ? {} : { origin }) },
      }),
    );
  assert.equal(
    allowed(
      "http://localhost:3215/api/generate",
      "127.0.0.1:3215",
      "http://127.0.0.1:3215",
    ),
    true,
  );
  assert.equal(
    allowed(
      "http://127.0.0.1:3215/api/generate",
      "localhost:3215",
      "http://localhost:3215",
    ),
    true,
  );
  assert.equal(
    allowed(
      "https://internal.example/api/generate",
      "modhorizon.example",
      "https://modhorizon.example",
    ),
    true,
  );
  assert.equal(
    allowed("http://localhost:3215/api/generate", "127.0.0.1:3215"),
    true,
  );
  for (const origin of [
    "null",
    "",
    "malformed",
    "https://127.0.0.1:3215",
    "http://127.0.0.1:9999",
    "http://localhost:3215",
    "http://127.0.0.1:3215.attacker.example",
    "http://attacker.example",
    "http://user@127.0.0.1:3215",
    "http://127.0.0.1:3215/path",
    "http://127.0.0.1:3215/",
  ]) {
    assert.equal(
      allowed("http://localhost:3215/api/generate", "127.0.0.1:3215", origin),
      false,
      origin,
    );
  }
  assert.equal(
    allowed(
      "http://localhost:3215/api/generate",
      "attacker.example/path",
      "http://attacker.example",
    ),
    false,
  );
  assert.equal(
    hasAllowedOrigin(
      new Request("http://localhost:3215/api/generate", {
        headers: {
          host: "localhost:3215",
          origin: "https://attacker.example",
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "https",
        },
      }),
    ),
    false,
  );
});

test("development example returns honest preview and correct zombie listener", async () => {
  const project = await generatePlugin(request, new MockProvider());
  assert.equal(project.status, "preview");
  assert.equal(project.artifactAvailable, false);
  assert.equal(getArtifact(project.id), undefined);
  assert.match(project.files[0].content, /EntityType.ZOMBIE/);
  assert.match(project.files[0].content, /PotionEffectType.SPEED, 200, 1/);
  assert.match(project.files[0].content, /killer == null/);
  assert.match(project.logs.join(" "), /compilation has not run/);
});

test("mock refuses other prompts, extra instructions, and follow-up edits", async () => {
  for (const input of [
    { ...request, prompt: "Create a custom teleport command" },
    { ...request, prompt: request.prompt + " Also add teleport commands." },
    { ...request, project: await new MockProvider().generate(request) },
  ]) {
    const result = await generatePlugin(input, new MockProvider());
    assert.equal(result.status, "failed");
    assert.match(result.error!, /Development preview supports only/);
  }
});

test("input validation rejects invalid versions, unsafe source paths, collisions and oversized content", async () => {
  assert.throws(() => validateRequest({ ...request, version: "1.21.99" }));
  // 1.6.4 is a real release, but Paper never shipped a build for it.
  assert.throws(() => validateRequest({ ...request, version: "1.6.4" }));
  assert.throws(() => validateRequest({ ...request, target: "liteloader" }));
  assert.throws(() => validateRequest({ ...request, target: "fabric" }));
  assert.throws(() => validateRequest({ ...request, artifactType: "mod", target: "neoforge", version: "1.19.2" }));
  assert.equal(validateRequest({ ...request, target: undefined }).target, "paper");
  assert.equal(validateRequest({ ...request, artifactType: "mod", target: "forge", version: "1.7.10" }).version, "1.7.10");
  assert.throws(() => validateRequest({ ...request, artifactType: "resource_pack", target: "vanilla", version: "1.5.2" }), /1\.6\.1/);
  assert.equal(validateRequest({ ...request, artifactType: "shader_pack", target: "iris", version: "1.16.5" }).target, "iris");
  assert.throws(() => validateRequest({ ...request, prompt: "short" }));
  const generated = await new MockProvider().generate(request);
  for (const path of [
    "../Main.java",
    "src/main/java/../../Main.java",
    "src/main/java/C:\\Main.java",
    "/src/main/java/Main.java",
    "build.gradle",
    "src/main/resources/other.yml",
    "src/main/java/.java",
  ]) {
    assert.throws(() =>
      validateProject({
        ...generated,
        files: [...generated.files, { path, content: "" }],
      }),
    );
  }
  assert.throws(() =>
    validateProject({
      ...generated,
      files: [...generated.files, generated.files[0]],
    }),
  );
  assert.throws(() =>
    validateProject({
      ...generated,
      files: [{ ...generated.files[0], content: "a".repeat(40_001) }],
    }),
  );
});

test("failed compilation makes at most three repairs and no artifact", async () => {
  let generations = 0;
  let builds = 0;
  const fixture = await new MockProvider().generate(request);
  const provider: AIProvider = {
    name: "test",
    async generate(input, diagnostics) {
      generations++;
      if (generations > 1) {
        assert.deepEqual(input.project, fixture);
        assert.deepEqual(diagnostics, ["Compile error"]);
      }
      return fixture;
    },
  };
  const builder: BuildService = {
    async build() {
      builds++;
      return { success: false, logs: ["Compile error"] };
    },
  };
  const result = await generatePlugin(request, provider, builder);
  assert.equal(generations, 4);
  assert.equal(builds, 4);
  assert.equal(result.status, "failed");
  assert.equal(result.artifactAvailable, false);
  assert.match(result.error!, /three repair attempts/);
});

test("successful repair stores the actual artifact; service exceptions do not consume repair loops", async () => {
  const fixture = await new MockProvider().generate(request);
  let calls = 0;
  const artifact = new Uint8Array([0x50, 0x4b, 3, 4, 0]);
  const provider: AIProvider = {
    name: "test",
    async generate() {
      return fixture;
    },
  };
  const result = await generatePlugin(request, provider, {
    async build() {
      calls++;
      return calls === 1
        ? { success: false, logs: ["Fix it"] }
        : { success: true, logs: ["Done"], artifact };
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.status, "success");
  assert.equal(result.artifactAvailable, true);
  assert.deepEqual(getArtifact(result.id)?.artifact, artifact);
  calls = 0;
  const failure = await generatePlugin(request, provider, {
    async build() {
      calls++;
      throw new Error("Service timeout");
    },
  });
  assert.equal(calls, 1);
  assert.equal(failure.status, "failed");
  assert.match(failure.error!, /timeout/);
});

test("invalid repair paths never reach builder", async () => {
  const fixture = await new MockProvider().generate(request);
  let generations = 0;
  let builds = 0;
  const result = await generatePlugin(
    request,
    {
      name: "test",
      async generate() {
        generations++;
        return generations === 1
          ? fixture
          : {
              ...fixture,
              files: [{ path: "build.gradle", content: "unsafe" }],
            };
      },
    },
    {
      async build() {
        builds++;
        return { success: false, logs: ["Failure"] };
      },
    },
  );
  assert.equal(builds, 1);
  assert.equal(result.status, "failed");
});

test("remote build verifies returned artifact and authenticates server-side", async () => {
  const fixture = await new MockProvider().generate(request);
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.BUILD_SERVICE_URL;
  const originalToken = process.env.BUILD_SERVICE_TOKEN;
  process.env.BUILD_SERVICE_URL = "https://builder.example/build";
  process.env.BUILD_SERVICE_TOKEN = "test-secret";
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        "Bearer test-secret",
      );
      assert.equal(init?.redirect, "error");
      const body = JSON.parse(init!.body as string);
      // Paper plugins keep protocol 1 for the existing Paper worker.
      assert.equal(body.schemaVersion, 1);
      assert.equal(body.platform, "paper");
      assert.equal(body.minecraftVersion, "1.21.4");
      assert.equal(body.javaVersion, 21);
      return Response.json({
        success: true,
        logs: ["Built"],
        artifactBase64: "bm90IGEgamFy",
      });
    };
    await assert.rejects(
      () => new RemoteBuildService().build(fixture, request),
      /invalid JAR/,
    );
    globalThis.fetch = async () =>
      Response.json({
        success: true,
        logs: ["Built"],
        artifactBase64: Buffer.from([0x50, 0x4b, 3, 4]).toString("base64"),
      });
    const result = await new RemoteBuildService().build(fixture, request);
    assert.equal(result.success, true);
    assert.equal(result.artifact?.length, 4);
    let sent: Record<string, unknown> = {};
    globalThis.fetch = async (_url, init) => {
      sent = JSON.parse(init!.body as string);
      return Response.json({ success: false, logs: ["Failed"] });
    };
    await new RemoteBuildService().build(fixture, { version: "1.16.5", artifactType: "mod", target: "forge" });
    assert.deepEqual(
      { schemaVersion: sent.schemaVersion, artifactType: sent.artifactType, family: sent.family, javaVersion: sent.javaVersion, mappings: sent.mappings, minecraftVersion: sent.minecraftVersion },
      { schemaVersion: 2, artifactType: "mod", family: "forge", javaVersion: 8, mappings: "mcp", minecraftVersion: "1.16.5" },
    );
    await new RemoteBuildService().build(fixture, { version: "3.4.0", artifactType: "plugin", target: "velocity" });
    assert.equal(sent.apiVersion, "3.4.0");
    assert.equal(sent.minecraftVersion, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.BUILD_SERVICE_URL;
    else process.env.BUILD_SERVICE_URL = originalUrl;
    if (originalToken === undefined) delete process.env.BUILD_SERVICE_TOKEN;
    else process.env.BUILD_SERVICE_TOKEN = originalToken;
  }
});

test("stream parser rejects oversized and slow bodies", async () => {
  await assert.rejects(
    () => limitedJson(Response.json({ content: "a".repeat(100) }), 10),
    /size limit/,
  );
  const slow = new ReadableStream<Uint8Array>({
    start() {
      /* Deliberately never supply bytes. */
    },
  });
  await assert.rejects(
    () => limitedJson(new Response(slow), 100, 20),
    /timed out/,
  );
});

test("production forbids mock mode and insecure endpoints", () => {
  const originalMode = process.env.AI_PROVIDER;
  const originalNodeEnv = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "production", AI_PROVIDER: "mock" });
  try {
    assert.throws(() => createAIProvider(), /disabled in production/);
    assert.throws(
      () => trustedEndpoint("http://127.0.0.1/build", "test"),
      /trusted HTTPS/,
    );
    assert.throws(
      () =>
        trustedEndpoint("https://user:secret@builder.example/build", "test"),
      /trusted HTTPS/,
    );
  } finally {
    if (originalMode === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = originalMode;
    if (originalNodeEnv === undefined)
      Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: originalNodeEnv });
  }
});

test("direct provider creation cannot bypass the testing model lock", () => {
  const keys=["AI_TESTING_MODE","OPENAI_API_KEY","ANTHROPIC_API_KEY","GEMINI_API_KEY"] as const;
  const previous=keys.map(key=>process.env[key]);
  Object.assign(process.env,{AI_TESTING_MODE:"true",OPENAI_API_KEY:"fake",ANTHROPIC_API_KEY:"fake",GEMINI_API_KEY:"fake"});
  try {
    for (const model of ["gpt-6-astra","gpt-6.1-sol","claude-opus-5-5","gemini-4-argon"])
      assert.throws(()=>createAIProvider(model),/not connected/);
  } finally {
    keys.forEach((key,index)=>{if(previous[index]===undefined)delete process.env[key];else process.env[key]=previous[index];});
  }
});
