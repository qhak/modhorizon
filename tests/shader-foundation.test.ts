import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { validateProject } from "../src/lib/validation";
import { packageMinecraftPack } from "../src/lib/packager";

test("the original foundation fits the live source contract and packages without normalisation or feature warnings", () => {
  const root = join(process.cwd(), "shader-foundations/aurora-horizon");
  const collect = (directory: string): { path: string; content: string }[] => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collect(path) : [{ path: relative(root, path).replaceAll("\\", "/"), content: readFileSync(path, "utf8") }];
  });
  const files = collect(root);
  const project = validateProject({ name: "AuroraHorizonCandidate03", files }, "shader_pack", "iris", "1.21.11");
  assert.deepEqual(project.files, files, "Validation must not repair or alter the authored foundation");
  assert.equal(project.message, undefined);
  assert.deepEqual(project.shaderReport!.features.flatMap(feature => feature.warnings || []), []);
  assert.ok(project.shaderReport!.features.some(feature => feature.kind === "shadows" && feature.status === "implemented"));
  assert.ok(project.shaderReport!.features.some(feature => feature.kind === "reflections" && feature.status === "implemented"));
  const result = packageMinecraftPack(project, "shader_pack", "1.21.11");
  assert.deepEqual(result.files, files);
  assert.equal(Buffer.from(result.artifact).readUInt32LE(), 0x04034b50);
  assert.ok(result.artifact.length > 1000);
});

test("the terrain material iteration preserves the owner-approved water and post-processing source", () => {
  const approved = {
    "gbuffers_water.vsh": "98e7b3fc4034b1378ac75b7dbe80d872e2ca36a7e139cb4d9d2aa314da2f0b1e",
    "gbuffers_water.fsh": "4deb2da4d8f55af0542833d2647550d4244aab840aa54addf07b9c646bb1c68e",
    "composite.fsh": "567be80eb04ff827bb5775228b087a96d553a26a91d798ca357be00a173d41a4",
    "final.fsh": "7f2afa1079e57d60b56620ffd6f336125745c843ee1cb15379360c15ce3db1ec",
    "begin.fsh": "284a651b07565c6986b7db1bcc14f7ac899caa5e90a587995092f7a4a34272bf",
  };
  for (const [name, hash] of Object.entries(approved)) {
    const source = readFileSync(join(process.cwd(), "shader-foundations/aurora-horizon/shaders", name), "utf8").replaceAll("\r\n", "\n");
    assert.equal(createHash("sha256").update(source).digest("hex"), hash, name);
  }
});
