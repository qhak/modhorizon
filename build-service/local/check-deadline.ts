import assert from "node:assert/strict";
import { compileDockerJob } from "./docker-job";
import { MockProvider } from "../../src/lib/mock-provider";

async function main() {
  const project = await new MockProvider().generate({ prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", artifactType: "plugin", target: "paper", version: "1.21.4" });
  await assert.rejects(compileDockerJob({ schemaVersion: 1, platform: "paper", javaVersion: 21, minecraftVersion: "1.21.4", project }, 3000), /deadline\. Job container removed/);
  console.log("Forced local compilation deadline and container removal passed. No AI call was made.");
}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Deadline check failed."); process.exitCode = 1; });
