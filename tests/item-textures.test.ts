import assert from "node:assert/strict";
import test from "node:test";
import { inflateRawSync, inflateSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ITEM_TEXTURE_BASES } from "../src/lib/item-texture-bases";
import { ITEM_TEXTURE_NAMES, isItemRecolorPath, parseItemRecolor, renderItemRecolor, supportsItemRecolorVersion } from "../src/lib/item-textures";
import { artifactSystemPrompt } from "../src/lib/artifact-experts";
import { TexturePreviews } from "../src/components/texture-previews";
import { packageMinecraftPack } from "../src/lib/packager";
import { validateProject, validateRequest } from "../src/lib/validation";
import { generateArtifact } from "../src/lib/generation";
import { getArtifact } from "../src/lib/project-store";

const recipe = JSON.stringify({ color: "#a82040" });
const itemPath = (name: string) => `assets/minecraft/textures/item/${name}.recolor.json`;
const fixture = () => ({ name: "CherryTools", files: [
  { path: "pack.mcmeta", content: JSON.stringify({ pack: { pack_format: 46, description: "Cherry diamond tools" } }) },
  ...ITEM_TEXTURE_NAMES.map(name => ({ path: itemPath(name), content: recipe })),
] });

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function decodePng(input: Uint8Array) {
  const bytes = Buffer.from(input);
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const idat: Buffer[] = [];
  let offset = 8;
  let ended = false;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    assert.equal(bytes.readUInt32BE(offset + 8 + length), crc32(bytes.subarray(offset + 4, offset + 8 + length)), `${type} CRC`);
    if (type === "IHDR") {
      assert.equal(data.readUInt32BE(0), 16);
      assert.equal(data.readUInt32BE(4), 16);
      assert.deepEqual([...data.subarray(8)], [8, 6, 0, 0, 0], "8-bit RGBA without interlace");
    }
    if (type === "IDAT") idat.push(data);
    offset += length + 12;
    if (type === "IEND") { ended = true; break; }
  }
  assert.ok(ended);
  assert.equal(offset, bytes.length, "PNG has no trailing garbage");
  const rows = inflateSync(Buffer.concat(idat));
  assert.equal(rows.length, 16 * 65);
  const rgba = Buffer.alloc(16 * 16 * 4);
  for (let row = 0; row < 16; row++) {
    assert.equal(rows[row * 65], 0, "unfiltered PNG scanline");
    rows.copy(rgba, row * 64, row * 65 + 1, row * 65 + 65);
  }
  return rgba;
}

function unzip(input: Uint8Array) {
  const bytes = Buffer.from(input);
  const result: Record<string, Buffer> = {};
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const length = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const path = bytes.toString("utf8", offset + 30, offset + 30 + nameLength);
    const start = offset + 30 + nameLength + extraLength;
    const data = inflateRawSync(bytes.subarray(start, start + length));
    assert.equal(data.length, bytes.readUInt32LE(offset + 22));
    assert.equal(crc32(data), bytes.readUInt32LE(offset + 14), `${path} ZIP CRC`);
    result[path] = data;
    offset = start + length;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  return result;
}

test("all diamond tools render genuine shaded PNGs and preserve source silhouettes and wooden handles", () => {
  for (const name of ITEM_TEXTURE_NAMES) {
    const source = ITEM_TEXTURE_BASES.textures[name];
    const red = renderItemRecolor(itemPath(name), recipe);
    const blue = renderItemRecolor(itemPath(name), '{"color":"#2040a8"}');
    assert.equal(red.path, `assets/minecraft/textures/item/${name}.png`);
    const redPixels = decodePng(red.bytes), bluePixels = decodePng(blue.bytes);
    const shades = new Set<string>();
    let preservedOpaque = 0, changed = 0, transparent = 0;
    for (let pixel = 0; pixel < 256; pixel++) {
      const index = parseInt(source.pixels.slice(pixel * 2, pixel * 2 + 2), 16);
      const original = source.palette[index];
      const actual = [...redPixels.subarray(pixel * 4, pixel * 4 + 4)];
      assert.equal(actual[3], original[3], `${name} alpha at ${pixel}`);
      if (!original[3]) transparent++;
      if (!(source.diamondPalette as readonly number[]).includes(index)) {
        assert.deepEqual(actual, [...original], `${name} unchanged handle/background at ${pixel}`);
        assert.deepEqual(redPixels.subarray(pixel * 4, pixel * 4 + 4), bluePixels.subarray(pixel * 4, pixel * 4 + 4));
        if (original[3]) preservedOpaque++;
      } else {
        assert.ok(actual[0] > actual[2] && actual[2] > actual[1], `${name} cherry-red facets`);
        assert.notDeepEqual(redPixels.subarray(pixel * 4, pixel * 4 + 3), bluePixels.subarray(pixel * 4, pixel * 4 + 3));
        shades.add(actual.slice(0, 3).join(","));
        changed++;
      }
    }
    assert.ok(changed > 0 && preservedOpaque > 0 && transparent > 0);
    assert.ok(shades.size >= 3, `${name} retains facet shading`);
    assert.deepEqual(renderItemRecolor(itemPath(name), recipe).bytes, red.bytes, "deterministic output");
  }
});

test("texture recipes strictly constrain color, fields, item names and paths", () => {
  assert.deepEqual(parseItemRecolor(itemPath("diamond_sword"), '{"color":"#A82040"}'), { name: "diamond_sword", color: "#a82040" });
  for (const content of ['{}', 'null', '[]', '{', '{"color":"red"}', '{"color":"#abc"}', '{"color":"#12345678"}', '{"color":123}', '{"color":"#a82040","url":"https://example.com/texture.png"}', JSON.stringify({ color: "#a82040\n" }), JSON.stringify({ color: "#a82040", size: 1024 }), " ".repeat(257)]) {
    assert.throws(() => parseItemRecolor(itemPath("diamond_sword"), content));
  }
  for (const path of [itemPath("diamond_sword") + "\n", itemPath("diamond_helmet"), itemPath("iron_sword"), "assets/custom/textures/item/diamond_sword.recolor.json", "assets/minecraft/textures/item/../diamond_sword.recolor.json", "/" + itemPath("diamond_sword"), "assets\\minecraft\\textures\\item\\diamond_sword.recolor.json"]) {
    assert.equal(isItemRecolorPath(path), false);
    assert.throws(() => renderItemRecolor(path, recipe));
  }
  assert.equal(supportsItemRecolorVersion("1.21.4\n"), false);
  assert.equal(supportsItemRecolorVersion("1.21.4"), true);
});

test("pack validation rejects unsupported texture recipes rather than accepting generic JSON placeholders", () => {
  assert.doesNotThrow(() => validateProject(fixture(), "resource_pack", "vanilla", "1.21.4"));
  for (const path of [itemPath("diamond_helmet"), itemPath("iron_sword"), "assets/demo/textures/item/diamond_sword.recolor.json"]) {
    const source = fixture();
    source.files.push({ path, content: recipe });
    assert.throws(() => validateProject(source, "resource_pack", "vanilla", "1.21.4"));
  }
  const invalid = fixture();
  invalid.files[1].content = '{"color":"red"}';
  assert.throws(() => validateProject(invalid, "resource_pack", "vanilla", "1.21.4"));
  assert.throws(() => validateProject(fixture(), "resource_pack", "vanilla", "1.20.4"));
});

test("resource pack ZIP contains real tool PNGs, version metadata and no internal recipes", () => {
  const packed = packageMinecraftPack(fixture(), "resource_pack", "1.21.4");
  const files = unzip(packed.artifact);
  assert.equal(JSON.parse(files["pack.mcmeta"].toString()).pack.pack_format, 46);
  assert.equal(Object.keys(files).some(path => path.endsWith(".recolor.json")), false);
  for (const name of ITEM_TEXTURE_NAMES) decodePng(files[`assets/minecraft/textures/item/${name}.png`]);
  assert.equal(Object.keys(files).length, 6);
});

test("generated texture pack stores a downloadable PNG ZIP without a Java builder or image-provider call", async () => {
  const input = validateRequest({ prompt: "Make my diamond tools dark cherry red.", artifactType: "resource_pack", target: "vanilla", version: "1.21.4" });
  let calls = 0;
  const project = await generateArtifact(input, { name: "Texture fixture", async generate() { calls++; return fixture(); } }, { async build() { throw new Error("Resource packs must not call a Java builder"); } });
  assert.equal(calls, 1);
  assert.equal(project.status, "success", project.error);
  assert.equal(project.artifactAvailable, true);
  const artifact = getArtifact(project.id);
  assert.ok(artifact);
  const files = unzip(artifact.artifact);
  decodePng(files["assets/minecraft/textures/item/diamond_sword.png"]);
  assert.equal(Object.keys(files).some(path => path.endsWith(".recolor.json")), false);
});

test("a short resource-pack request receives the exact recipe contract and honest armor limitations", () => {
  const input = validateRequest({ prompt: "Make my diamond tools and armor cherry red.", artifactType: "resource_pack", target: "vanilla", version: "1.21.4" });
  const prompt = artifactSystemPrompt(input);
  assert.ok(prompt.includes("assets/minecraft/textures/item/<item>.recolor.json"));
  assert.ok(prompt.includes('{"color":"#a82040"}'));
  for (const name of ITEM_TEXTURE_NAMES) assert.ok(prompt.includes(name));
  assert.match(prompt, /does not generate worn armor/);
  assert.match(prompt, /disclose the armor omission prominently/);
});

test("texture previews show the five packaged PNGs and safely hide malformed recipes", () => {
  const markup = renderToStaticMarkup(createElement(TexturePreviews, { files: fixture().files }));
  const previews = [...markup.matchAll(/src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g)];
  assert.equal(previews.length, 5);
  for (const [index, name] of ITEM_TEXTURE_NAMES.entries()) {
    const expected = renderItemRecolor(itemPath(name), recipe);
    const bytes = Buffer.from(previews[index][1], "base64");
    assert.deepEqual(bytes, Buffer.from(expected.bytes), "preview uses the identical downloaded PNG renderer");
    decodePng(bytes);
  }
  const invalid = { path: itemPath("diamond_sword"), content: '{"color":"red"}' };
  assert.equal(renderToStaticMarkup(createElement(TexturePreviews, { files: [invalid] })), "");
  const mixed = renderToStaticMarkup(createElement(TexturePreviews, { files: [...fixture().files, invalid] }));
  assert.equal([...mixed.matchAll(/src="data:image\/png;base64,/g)].length, 5);
});
