import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { mkdirSync, writeFileSync } from "node:fs";
import { localBuilderServer } from "./server";
import { compileDockerJob } from "./docker-job";
import { MockProvider } from "../../src/lib/mock-provider";
import { RemoteBuildService } from "../../src/lib/build-service";
import { generatePlugin } from "../../src/lib/generation";
import { getArtifact } from "../../src/lib/project-store";

async function main() {
  // This test deliberately does not read .dev.vars or any saved credential.
  const token = randomBytes(32).toString("hex");
  const server = localBuilderServer(token, payload => compileDockerJob(payload), 3231);
  server.listen(3231, "127.0.0.1");
  await once(server, "listening");
  Object.assign(process.env, { NODE_ENV: "development", BUILD_SERVICE_URL: "http://127.0.0.1:3231/build", BUILD_SERVICE_TOKEN: token });
  try {
    const project = await generatePlugin({ prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", artifactType: "plugin", target: "paper", version: "1.21.4" }, new MockProvider(), new RemoteBuildService());
    assert.equal(project.status, "success", project.logs.join("\n"));
    const result = getArtifact(project.id);
    assert.ok(result?.artifact.length);
    mkdirSync(".data/compiler-check", { recursive: true });
    writeFileSync(".data/compiler-check/ZombieSprint.jar", result.artifact);
    console.log(JSON.stringify({ status: project.status, name: project.name, files: project.files.length, jarBytes: result.artifact.length, artifactAvailable: project.artifactAvailable }));
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "HTTP build acceptance failed."); process.exitCode = 1; });
