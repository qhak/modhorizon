import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { LocalGenerationAgent } from "../scripts/local-http-runtime.mjs";

test("local HTTP agent allows delayed headers while respecting shorter request aborts", async () => {
  const server = createServer((_request, response) => { setTimeout(() => response.end("completed"), 120); });
  await new Promise<void>(accept => server.listen(0, "127.0.0.1", accept));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const agent = new LocalGenerationAgent(2000);
  let dispatches = 0;
  const dispatcher = { dispatch(options: unknown, handler: unknown) {
    dispatches++;
    // Mimic fetch supplying a lower timeout; the local agent replaces it.
    return agent.dispatch({ ...(options as object), headersTimeout: 1 }, handler);
  } };
  try {
    const response = await fetch(url, { dispatcher, signal: AbortSignal.timeout(2000) } as RequestInit);
    assert.equal(await response.text(), "completed");
    await assert.rejects(fetch(url, { dispatcher, signal: AbortSignal.timeout(20) } as RequestInit), error => error instanceof Error && error.name === "TimeoutError");
    assert.equal(dispatches, 2, "No automatic retry is installed");
  } finally { await agent.destroy(); server.closeAllConnections(); await new Promise<void>(accept => server.close(() => accept())); }
});

test("local launcher preload installs a non-retrying dispatcher in Node child workers", () => {
  const preload = pathToFileURL(resolve("scripts/local-http-runtime.mjs")).href;
  const output = execFileSync(process.execPath, ["--input-type=module", "--eval", "import { getGlobalDispatcher } from 'undici'; console.log(getGlobalDispatcher().constructor.name)"], {
    cwd: process.cwd(), windowsHide: true, encoding: "utf8",
    env: { NODE_ENV: "development", SystemRoot: process.env.SystemRoot, MODHORIZON_LOCAL_HTTP: "true", NODE_OPTIONS: `--import=${preload}` },
  });
  assert.equal(output.trim(), "LocalGenerationAgent");
});
