import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { validateProject } from "../../src/lib/validation";
import type { GeneratedProject } from "../../src/lib/types";

// No generated scripts are executed. GPU compilation itself is NOT an OS sandbox.
// This service must stay on a trusted developer machine, never a public build host.
export async function compileShader(project: GeneratedProject, python: string) {
  const directory = await mkdtemp(join(tmpdir(), "modhorizon-glsl-"));
  try {
    for (const file of project.files.filter(file => file.path.startsWith("shaders/"))) {
      const path = resolve(directory, file.path);
      if (!path.startsWith(directory + "/") && !path.startsWith(directory + "\\")) throw new Error("Invalid source path.");
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, file.content, "utf8");
    }
    return await new Promise<{ success: boolean; logs: string[] }>((accept, reject) => {
      const child = spawn(python, [resolve("scripts/shaders/check_glsl.py"), directory], {
        windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"],
        // Do not expose application/provider credentials to the compiler process.
        env: { NODE_ENV: "development", SystemRoot: process.env.SystemRoot, TEMP: tmpdir(), TMP: tmpdir(), PYTHONIOENCODING: "utf-8" },
      });
      let output = "", bytes = 0, stopped = false;
      const stop = () => { stopped = true; child.kill(); };
      const timer = setTimeout(stop, 30_000);
      const collect = (chunk: Buffer) => { bytes += chunk.length; if (bytes > 80_000) stop(); else output += chunk.toString("utf8"); };
      child.stdout.on("data", collect); child.stderr.on("data", collect);
      child.on("error", error => { clearTimeout(timer); reject(error); });
      child.on("close", code => {
        clearTimeout(timer);
        if (stopped || !/Compiled \d+ stages; linked \d+ programs; \d+ failed programs\./.test(output)) return reject(new Error("Compiler unavailable, timed out or exceeded its output limit."));
        accept({ success: code === 0, logs: output.replaceAll(directory, "<source>").split(/\r?\n/).filter(Boolean).slice(0, 200).map(line => line.slice(0, 2000)) });
      });
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

export function shaderCompilerServer(token: string, compile: typeof compileShader, python: string) {
  if (token.length < 32) throw new Error("Compiler token must contain at least 32 characters.");
  const digest = (value: string) => createHash("sha256").update(value).digest();
  let busy = false;
  const server = createServer(async (request, response) => {
    const reply = (status: number, body: unknown) => { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify(body)); };
    if (request.headers.host !== `127.0.0.1:${(server.address() as { port: number }).port}` || request.headers.origin) return reply(403, { error: "Server-to-server loopback access only." });
    const auth = request.headers.authorization || "";
    if (auth.length > 512 || !timingSafeEqual(digest(auth), digest(`Bearer ${token}`))) return reply(401, { error: "Authentication required." });
    if (request.method === "GET" && request.url === "/health") return reply(200, { service: "local-raw-glsl", busy });
    if (request.method !== "POST" || request.url !== "/check") return reply(404, { error: "Not found." });
    if (!request.headers["content-type"]?.includes("application/json")) return reply(415, { error: "JSON required." });
    if (busy) return reply(429, { error: "Compiler busy." });
    busy = true;
    try {
      let raw = Buffer.alloc(0);
      for await (const chunk of request) {
        if (raw.length + chunk.length > 200_000) return reply(413, { error: "Source request too large." });
        raw = Buffer.concat([raw, chunk]);
      }
      let project: GeneratedProject;
      try { project = validateProject(JSON.parse(raw.toString("utf8")), "shader_pack", "iris", "1.21.11"); }
      catch { return reply(400, { error: "Invalid shader source." }); }
      reply(200, await compile(project, python));
    } catch { reply(503, { error: "Local GLSL compiler unavailable." }); }
    finally { busy = false; }
  });
  server.requestTimeout = 10_000; server.headersTimeout = 5_000;
  return server;
}
