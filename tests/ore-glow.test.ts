import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";
import { oreGlowMaterialFiles } from "../src/lib/ore-glow-materials";
import { ORE_TEXTURE_BASES } from "../src/lib/ore-texture-bases";
import { ORE_TEXTURE_NAMES } from "../src/lib/ore-textures";

function pngPixels(input: Uint8Array) {
  const bytes = Buffer.from(input);
  assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const idat: Buffer[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const kind = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    let crc = 0xffffffff;
    for (const byte of bytes.subarray(offset + 4, offset + 8 + length)) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    assert.equal(bytes.readUInt32BE(offset + 8 + length), (crc ^ 0xffffffff) >>> 0, `${kind} CRC`);
    if (kind === "IHDR") {
      assert.equal(data.readUInt32BE(0), 16);
      assert.equal(data.readUInt32BE(4), 16);
      assert.deepEqual([...data.subarray(8)], [8, 6, 0, 0, 0]);
    }
    if (kind === "IDAT") idat.push(data);
    offset += length + 12;
    if (kind === "IEND") break;
  }
  assert.equal(offset, bytes.length);
  const rows = inflateSync(Buffer.concat(idat));
  assert.equal(rows.length, 16 * 65);
  return Array.from({ length: 256 }, (_, i) => {
    const y = Math.floor(i / 16), x = i % 16;
    assert.equal(rows[y * 65], 0);
    return [...rows.subarray(y * 65 + 1 + x * 4, y * 65 + 1 + x * 4 + 4)];
  });
}

test("OreGlow companion has 18 opaque albedos and exact mineral-only LabPBR emission alpha", () => {
  const files = oreGlowMaterialFiles("1.21.4");
  assert.equal(files.length, 39);
  assert.equal(new Set(files.map(file => file.path)).size, files.length);
  const byPath = new Map(files.map(file => [file.path, file.bytes]));
  for (const name of ORE_TEXTURE_NAMES) {
    const root = `assets/minecraft/textures/block/${name}`;
    const albedo = pngPixels(byPath.get(`${root}.png`)!);
    const material = pngPixels(byPath.get(`${root}_s.png`)!);
    const source = ORE_TEXTURE_BASES.textures[name];
    for (let i = 0; i < 256; i++) {
      assert.equal(albedo[i][3], 255, `${name}: albedo remains opaque`);
      assert.deepEqual(material[i], [0, 10, 0, source.oreMask[i] === "1" ? 254 : 0]);
      assert.notEqual(material[i][3], 255, "LabPBR no-emission sentinel must not encode mineral emission");
    }
  }
  assert.ok(files.every(file => !file.path.endsWith(".ore.json") && !file.path.endsWith("_e.png")));
});

test("OreGlow companion version metadata and dependency notes remain explicit", () => {
  for (const [version, format] of [["1.21.4", 46], ["1.21.11", 75]] as const) {
    const files = oreGlowMaterialFiles(version);
    const text = (path: string) => new TextDecoder().decode(files.find(file => file.path === path)!.bytes);
    const pack = JSON.parse(text("pack.mcmeta")).pack;
    assert.equal(pack.pack_format, format);
    if (format >= 65) {
      assert.deepEqual(pack.min_format, [format, 0]);
      assert.deepEqual(pack.max_format, [format, 0]);
    }
    assert.equal(text("assets/minecraft/optifine/texture.properties"), "format=lab-pbr/1.3\n");
    assert.match(text("README.md"), /Without a shader/);
    assert.match(text("README.md"), /do not cast light onto nearby blocks/);
    assert.match(text("README.md"), /No provider call/);
  }
  for (const version of ["1.20.6", "1.21.4\n", "../1.21.4", "1.21.12"])
    assert.throws(() => oreGlowMaterialFiles(version), /require Minecraft/);
});
