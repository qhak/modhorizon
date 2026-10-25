import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { generateArtifact } from "../src/lib/generation";
import { exampleDatapack } from "../src/lib/example-datapack";
import { shaderPackFixture } from "./fixtures/shader-pack";
import { getArtifact } from "../src/lib/project-store";

test("integrated datapacks bypass GLSL while shader ZIPs retain the compiler gate", async () => {
  let checks = 0;
  const compiler = { async check() { checks++; return { success: false, logs: ["fixture compile failure"] }; } };
  const base = { prompt: "Create the requested artifact.", version: "1.21.11", modelId: "gpt-6-luna" };
  const data = await generateArtifact({ ...base, artifactType: "datapack", target: "vanilla" },
    { name: "fixture", async generate() { return exampleDatapack(base.version); } }, undefined, compiler);
  assert.equal(data.status, "success");
  assert.ok(getArtifact(data.id));
  assert.equal(checks, 0);
  const shader = await generateArtifact({ ...base, artifactType: "shader_pack", target: "iris", shaderRepairCredits: 0 },
    { name: "fixture", async generate() { return shaderPackFixture(); } }, undefined, compiler);
  assert.equal(shader.status, "failed");
  assert.equal(getArtifact(shader.id), undefined);
  assert.equal(checks, 1);
});

test("bundled application source is strict UTF-8 for the production compiler", () => {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  function check(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) check(path);
      else if (/\.(?:ts|tsx|js|mjs|json)$/.test(entry.name))
        assert.doesNotThrow(() => decoder.decode(readFileSync(path)), path);
    }
  }
  check(resolve("src"));
});
