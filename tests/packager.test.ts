import assert from "node:assert/strict";
import test from "node:test";
import { inflateRawSync } from "node:zlib";
import { packageMinecraftPack } from "../src/lib/packager";

function readSingleFileZip(archive: Uint8Array) {
  const bytes = Buffer.from(archive);
  assert.equal(bytes.readUInt32LE(0), 0x04034b50, "ZIP local file header");
  const nameLength = bytes.readUInt16LE(26), extraLength = bytes.readUInt16LE(28);
  const compressedLength = bytes.readUInt32LE(18);
  const content = inflateRawSync(bytes.subarray(30 + nameLength + extraLength, 30 + nameLength + extraLength + compressedLength));
  return { name: bytes.toString("utf8", 30, 30 + nameLength), content: content.toString("utf8"), bytes };
}

test("resource pack download is a readable ZIP with version-correct metadata", () => {
  const project = { name: "Test Pack", files: [
    { path: "pack.mcmeta", content: JSON.stringify({ pack: { pack_format: 99, supported_formats: [1, 99], description: "Test" } }) },
    { path: "assets/test/lang/en_us.json", content: "{}" },
  ] };
  const result = packageMinecraftPack(project, "resource_pack", "1.21.9");
  assert.equal(result.files[0].content.includes("supported_formats"), false);
  assert.equal(result.files[0].content.includes('"pack_format": 69'), true);
  assert.deepEqual(JSON.parse(result.files[0].content).pack.min_format, [69, 0]);
  const file = readSingleFileZip(result.artifact);
  assert.equal(file.name, "pack.mcmeta");
  assert.equal(JSON.parse(file.content).pack.pack_format, 69);
  assert.equal(file.bytes.readUInt32LE(file.bytes.length - 22), 0x06054b50, "ZIP end of central directory");
});

test("shader pack download is a readable ZIP and rejects unrelated artifact types", () => {
  const result = packageMinecraftPack({ name: "Test Shader", files: [{ path: "shaders/core/example.fsh", content: "void main() {}" }] }, "shader_pack", "1.21.4");
  const file = readSingleFileZip(result.artifact);
  assert.equal(file.name, "shaders/core/example.fsh");
  assert.equal(file.content, "void main() {}");
  assert.throws(() => packageMinecraftPack({ name: "Plugin", files: [] }, "plugin", "1.21.4"), /only available/);
});
