import { createServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { validateProject } from "../../src/lib/validation";

const digest = (value: string) => createHash("sha256").update(value).digest();
export function localBuilderServer(token: string, compile: (payload: unknown) => Promise<unknown>, port = 3230) {
  if (token.length < 32) throw new Error("Local build token must contain at least 32 characters.");
  let busy = false;
  const server = createServer(async (request, response) => {
    const reply = (status: number, body: unknown) => { response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(JSON.stringify(body)); };
    if (request.headers.host !== `127.0.0.1:${port}` && request.headers.host !== `localhost:${port}`) return reply(403, { error: "Local host required." });
    if (request.headers.origin && !["http://127.0.0.1:3215", "http://localhost:3215"].includes(request.headers.origin)) return reply(403, { error: "Local origin required." });
    const supplied = request.headers.authorization || "";
    if (supplied.length > 512 || !timingSafeEqual(digest(supplied), digest(`Bearer ${token}`))) return reply(401, { error: "Authentication required." });
    if (request.method === "GET" && request.url === "/health") return reply(200, { service: "private-local-builder", supported: "Paper 1.21.4", busy });
    if (request.method !== "POST" || request.url !== "/build") return reply(404, { error: "Not found." });
    if (!request.headers["content-type"]?.includes("application/json")) return reply(415, { error: "JSON required." });
    if (Number(request.headers["content-length"] || 0) > 200_000) return reply(413, { error: "Request too large." });
    if (busy) return reply(429, { error: "A local build is already running." });
    busy = true;
    let raw = Buffer.alloc(0);
    try {
      for await (const chunk of request) {
        if (raw.length + chunk.length > 200_000) return reply(413, { error: "Request too large." });
        raw = Buffer.concat([raw, chunk]);
      }
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
        if (payload.schemaVersion !== 1 || payload.platform !== "paper" || payload.javaVersion !== 21 || payload.minecraftVersion !== "1.21.4") throw new Error("Only Paper 1.21.4 / Java 21 is prepared locally.");
        payload.project = validateProject(payload.project, "plugin", "paper", "1.21.4");
        if (payload.project.files.some((file: { path: string }) => !file.path.startsWith("src/main/java/") && !["src/main/resources/plugin.yml", "src/main/resources/config.yml"].includes(file.path))) throw new Error("Only Java, plugin.yml and config.yml are supported locally.");
      } catch (error) { return reply(400, { error: error instanceof Error ? error.message : "Invalid build request." }); }
      reply(200, await compile(payload));
    } catch { reply(503, { error: "Local compiler unavailable. Start Docker Desktop and prepare the build image." }); }
    finally { busy = false; }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  return server;
}
