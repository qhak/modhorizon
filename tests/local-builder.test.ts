import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { request as httpRequest } from "node:http";
import { localBuilderServer } from "../build-service/local/server";
import { dockerArguments } from "../build-service/local/docker-job";

const token = "local-only-test-token-that-is-long-enough";
const payload = { schemaVersion: 1, platform: "paper", javaVersion: 21, minecraftVersion: "1.21.4", project: { name: "Example", files: [
  { path: "src/main/java/dev/example/Example.java", content: "package dev.example; public class Example extends org.bukkit.plugin.java.JavaPlugin {}" },
  { path: "src/main/resources/plugin.yml", content: "name: Example\nversion: 1.0\nmain: dev.example.Example\napi-version: 1.21\n" },
] } };

async function fixture(compile: (input: unknown) => Promise<unknown>) {
  const server = localBuilderServer(token, compile, 0);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const call = (body: unknown = payload, headers: Record<string, string> = {}) => new Promise<Response>((resolve, reject) => {
    const req = httpRequest(`http://127.0.0.1:${port}/build`, {
      method: "POST", headers: { Host: "127.0.0.1:0", Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...headers },
    }, res => {
      const chunks: Buffer[] = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve(new Response(Buffer.concat(chunks), { status: res.statusCode, headers: { "cache-control": String(res.headers["cache-control"] || "") } })));
    });
    req.on("error", reject);
    req.end(JSON.stringify(body));
  });
  return { server, call, close: () => new Promise<void>(resolve => { server.closeAllConnections(); server.close(() => resolve()); }) };
}

test("local builder rejects unauthorized, foreign-origin and rebinding requests before compiling", async () => {
  let calls = 0;
  const { call, close } = await fixture(async () => { calls++; return { success: true }; });
  try {
    assert.equal((await call(payload, { Authorization: "Bearer wrong" })).status, 401);
    assert.equal((await call(payload, { Host: "attacker.example" })).status, 403);
    assert.equal((await call(payload, { Origin: "https://modhorizon.callout-ai.workers.dev" })).status, 403);
    assert.equal(calls, 0);
  } finally { await close(); }
});

test("local builder validates template/version/source and body limits before starting Docker", async () => {
  let calls = 0;
  const { call, close } = await fixture(async () => { calls++; return { success: true }; });
  try {
    assert.equal((await call({ ...payload, minecraftVersion: "1.21.11" })).status, 400);
    assert.equal((await call({ ...payload, schemaVersion: 2, platform: "forge" })).status, 400);
    for (const path of ["../escape.java", "build.gradle.kts", "src/main/resources/../../escape", "C:/escape.java"]) {
      const input = structuredClone(payload); input.project.files.push({ path, content: "unsafe" });
      assert.equal((await call(input)).status, 400);
    }
    assert.equal((await call({ data: "x".repeat(200_001) })).status, 413);
    assert.equal(calls, 0);
  } finally { await close(); }
});

test("local builder admits one job, returns compiler output and rejects concurrent work", async () => {
  let release!: () => void, started!: () => void;
  const running = new Promise<void>(resolve => { started = resolve; });
  const gate = new Promise<void>(resolve => { release = resolve; });
  const { call, close } = await fixture(async input => { assert.equal((input as typeof payload).project.name, "Example"); started(); await gate; return { success: false, logs: ["Compiler diagnostic"] }; });
  try {
    const first = call(); await running;
    assert.equal((await call()).status, 429);
    release(); const result = await first;
    assert.deepEqual(await result.json(), { success: false, logs: ["Compiler diagnostic"] });
    assert.equal(result.headers.get("cache-control"), "no-store");
  } finally { release(); await close(); }
});

test("Docker arguments enforce isolated offline nonroot jobs without host mounts or credentials", () => {
  const args = dockerArguments("test-job");
  for (const [option, value] of [["--network", "none"], ["--user", "1000:1000"], ["--cap-drop", "ALL"], ["--security-opt", "no-new-privileges"], ["--memory", "2g"], ["--memory-swap", "2g"], ["--cpus", "1"], ["--pids-limit", "128"]]) assert.equal(args[args.indexOf(option) + 1], value);
  assert.ok(args.includes("--read-only"));
  assert.ok(args.includes("--rm"));
  assert.ok(args.includes("--pull=never"));
  assert.ok(!args.some(arg => ["--mount", "--volume", "-v", "--env", "--env-file", "--privileged"].includes(arg)));
});
