import assert from "node:assert/strict";
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
  const project = validateProject({ name: "AuroraHorizonCandidate01", files }, "shader_pack", "iris", "1.21.11");
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
