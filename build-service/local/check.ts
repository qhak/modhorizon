import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { compileDockerJob } from "./docker-job";
import { MockProvider } from "../../src/lib/mock-provider";
async function main() {
const request = { prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", artifactType: "plugin" as const, target: "paper" as const, version: "1.21.4" };
const project = await new MockProvider().generate(request);
const input = { schemaVersion: 1, platform: "paper", javaVersion: 21, minecraftVersion: "1.21.4", project };
console.log("Compiling the fixed local example offline. No AI provider call is made.");
const result = await compileDockerJob(input) as { success: boolean; logs: string[]; artifactBase64?: string };
if (!result.success) throw new Error(result.logs?.join("\n") || "Offline compilation failed.");
const artifact = Buffer.from(result.artifactBase64 || "", "base64");
assert.ok(artifact.length > 4 && artifact.length <= 5_000_000);
assert.deepEqual([...artifact.subarray(0, 4)], [0x50, 0x4b, 3, 4]);
mkdirSync(".data/compiler-check", { recursive: true });
writeFileSync(".data/compiler-check/LocalBuilderSmoke.jar", artifact);
console.log("JAR saved to .data/compiler-check/LocalBuilderSmoke.jar; checking compiler errors next.");
const broken = structuredClone(input);
broken.project.files.find(file => file.path.endsWith(".java"))!.content += "\n invalid syntax ???";
const rejected = await compileDockerJob(broken) as { success: boolean; logs: string[] };
assert.equal(rejected.success, false);
assert.ok(rejected.logs.length > 0);
console.log("Offline JAR compilation and invalid-source rejection passed. Gameplay remains untested.");

}
void main().catch(error => { console.error(error instanceof Error ? error.message : "Local compiler check failed."); process.exitCode = 1; });
