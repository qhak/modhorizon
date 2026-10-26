import assert from "node:assert/strict";
import test from "node:test";
import { inflateRawSync } from "node:zlib";
import { validateProject, validateRequest } from "../src/lib/validation";
import { validateCreation, validateSnapshot } from "../src/lib/managed-project";
import { exampleDatapack } from "../src/lib/example-datapack";
import { dataPackFormat } from "../src/lib/datapack-versions";
import { MINECRAFT_RELEASES, compareVersions } from "../src/lib/platforms";
import { generateArtifact } from "../src/lib/generation";
import { packageMinecraftPack } from "../src/lib/packager";
import { getArtifact, bindArtifactOwner } from "../src/lib/project-store";
import { artifactCatalog, artifactSystemPrompt } from "../src/lib/artifact-experts";
import { serviceStatus } from "../src/lib/service-status";
import { CREATION_EXAMPLES, exampleHref } from "../src/lib/creation-examples";
import { GET as sampleDownload } from "../src/app/api/examples/datapack/route";
import { downloadStoredArtifact } from "../src/lib/artifact-download";
import type { D1Database } from "../src/lib/billing-db";

function unzip(archive: Uint8Array) {
  const bytes = Buffer.from(archive);
  const files: Record<string, string> = {};
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18);
    const nameSize = bytes.readUInt16LE(offset + 26), extraSize = bytes.readUInt16LE(offset + 28);
    const path = bytes.toString("utf8", offset + 30, offset + 30 + nameSize);
    const start = offset + 30 + nameSize + extraSize;
    files[path] = inflateRawSync(bytes.subarray(start, start + size)).toString("utf8");
    offset = start + size;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
  return files;
}

const input = { prompt: "Create a datapack with a manual colorful welcome function.", artifactType: "datapack", target: "vanilla", version: "1.21.4" };

test("datapacks are advertised, accepted for vanilla and rejected for unsupported targets/releases", () => {
  assert.equal(validateRequest(input).artifactType, "datapack");
  assert.ok(serviceStatus({ NODE_ENV: "production" }).artifactTypes.includes("datapack"));
  assert.equal(artifactCatalog().find(item => item.type === "datapack")?.output, "installable-zip");
  assert.equal(validateCreation({ name: "Welcome", kind: "datapack", platform: "vanilla", version: "1.21.4" }).kind, "datapack");
  assert.throws(() => validateRequest({ ...input, target: "paper" }), /Choose a target/);
  for (const version of ["1.12.2", "1.0", "9.99", "__proto__"]) {
    assert.throws(() => validateRequest({ ...input, version }));
    assert.throws(() => packageMinecraftPack(exampleDatapack("1.21.4"), "datapack", version));
  }
  assert.throws(() => validateCreation({ name: "Welcome", kind: "datapack", platform: "vanilla", version: "1.12.2" }), /1.13/);
});

test("all offered datapack releases package correct metadata and matching function directories", () => {
  const releases = MINECRAFT_RELEASES.filter(version => compareVersions(version, "1.13") >= 0);
  assert.equal(releases.length, 51);
  for (const version of releases) {
    const format = dataPackFormat(version)!;
    assert.ok(format, `Missing format for ${version}`);
    const source = exampleDatapack(version);
    const result = packageMinecraftPack(source, "datapack", version);
    const files = unzip(result.artifact);
    const metadata = JSON.parse(files["pack.mcmeta"]).pack;
    assert.ok(files[`data/modhorizon/${compareVersions(version, "1.21") >= 0 ? "function" : "functions"}/hello.mcfunction`]);
    if (format[0] >= 82) {
      assert.deepEqual(metadata.min_format, [...format]);
      assert.deepEqual(metadata.max_format, [...format]);
      assert.equal(metadata.pack_format, undefined);
      assert.equal(metadata.supported_formats, undefined);
    } else {
      assert.equal(metadata.pack_format, format[0]);
      assert.equal(metadata.min_format, undefined);
    }
  }
  assert.deepEqual(dataPackFormat("1.21.11"), [94, 1]);
  assert.deepEqual(dataPackFormat("26.3"), [121, 0]);
});

test("datapack validation rejects unsafe paths, wrong directory eras and broken function tags", () => {
  const source = exampleDatapack("1.21.4");
  const check = (files: typeof source.files) => validateProject({ ...source, files }, "datapack", "vanilla", "1.21.4");
  for (const path of ["../escape.json", "data/demo/../escape.json", "data/demo/function/run.sh", "assets/demo/lang/en_us.json", "data/Demo/function/hello.mcfunction", "data/demo/random/hello.mcfunction", "data/demo/functions/hello.mcfunction"]) {
    assert.throws(() => check([...source.files, { path, content: "say hello" }]));
  }
  assert.throws(() => check(source.files.filter(file => file.path !== "pack.mcmeta")), /pack.mcmeta/);
  assert.throws(() => check([...source.files, { path: "data/demo/recipe/bad.json", content: "{oops" }]), /valid JSON/);
  assert.throws(() => check([...source.files, { path: "data/modhorizon/function/slash.mcfunction", content: "/say hello" }]), /slash/);
  assert.throws(() => check([...source.files, { path: "data/minecraft/tags/functions/load.json", content: '{"values":["modhorizon:hello"]}' }]), /different Minecraft version/);
  assert.throws(() => check([...source.files, { path: "data/minecraft/tags/function/load.json", content: '{"values":["modhorizon:missing"]}' }]), /missing function/);
  assert.throws(() => check([...source.files, { path: "data/minecraft/tags/function/load.json", content: '{"values":[null]}' }]), /invalid function identifier/);
  assert.doesNotThrow(() => check([...source.files, { path: "data/minecraft/tags/function/load.json", content: '{"values":["modhorizon:hello"]}' }]));
  assert.throws(() => validateProject(source, "datapack", "vanilla", "1.20.4"), /legacy plural/);
});

test("modern datapacks accept new metadata, preserve minor versions and guide models to correct layouts", () => {
  const source = exampleDatapack("1.21.11");
  source.files[0].content = JSON.stringify({ pack: { description: "Modern", min_format: [94, 1], max_format: [94, 1] } });
  assert.doesNotThrow(() => validateProject(source, "datapack", "vanilla", "1.21.11"));
  const modern = artifactSystemPrompt({ ...input, artifactType: "datapack", target: "vanilla", version: "1.21.11" });
  assert.match(modern, /94, 1/);
  assert.match(modern, /singular directories/);
  assert.match(artifactSystemPrompt({ ...input, artifactType: "datapack", target: "vanilla", version: "1.20.4" }), /legacy plural/);
});

test("generated datapacks download as real ZIPs without invoking a Java builder", async () => {
  const request = validateRequest(input);
  const project = await generateArtifact(request, { name: "fixture", async generate() { return exampleDatapack(request.version); } }, { async build() { throw new Error("Datapacks must not invoke a Java builder"); } });
  assert.equal(project.status, "success");
  assert.equal(project.artifactAvailable, true);
  assert.match(project.logs.join("\n"), /have not been tested in Minecraft/);
  assert.ok(getArtifact(project.id));
  bindArtifactOwner(project.id,"fixture-owner");
  const db={prepare:()=>({bind(){return this;},async first(){return {deletion_requested_at:null};}})} as unknown as D1Database;
  const response = await downloadStoredArtifact(project.id,async()=>({BILLING_DB:db}));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/zip");
  assert.match(response.headers.get("Content-Disposition")!, /ModHorizonHello.zip/);
  assert.match(unzip(new Uint8Array(await response.arrayBuffer()))["data/modhorizon/function/hello.mcfunction"], /tellraw @s/);
  const snapshot = validateSnapshot(project);
  assert.equal(snapshot.artifactType, "datapack");
  assert.equal(snapshot.artifactAvailable, false, "restoring source must not resurrect an expired artifact");
});

test("sample downloads need no AI provider or account and reject unknown versions", async () => {
  const response = sampleDownload(new Request("http://localhost/api/examples/datapack?version=1.21.11"));
  assert.equal(response.status, 200);
  const files = unzip(new Uint8Array(await response.arrayBuffer()));
  assert.deepEqual(JSON.parse(files["pack.mcmeta"]).pack.min_format, [94, 1]);
  assert.match(files["README.md"], /no AI generation or credits required/);
  assert.equal(sampleDownload(new Request("http://localhost/api/examples/datapack?version=1.12.2")).status, 400);
});

test("all inspiration links preserve a valid target, release and complete prompt", () => {
  assert.equal(CREATION_EXAMPLES.length, 30);
  assert.equal(new Set(CREATION_EXAMPLES.map(example => example.title)).size, 30);
  for (const example of CREATION_EXAMPLES) {
    const query = new URL(exampleHref(example), "http://localhost").searchParams;
    assert.equal(query.get("prompt"), example.prompt);
    const request = validateRequest({ artifactType: query.get("type"), target: query.get("platform") || example.target, version: query.get("version"), prompt: query.get("prompt") });
    assert.equal(request.artifactType, example.type);
  }
});
