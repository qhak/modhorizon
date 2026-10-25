import assert from "node:assert/strict";
import test from "node:test";
import { inflateRawSync, inflateSync } from "node:zlib";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ORE_TEXTURE_BASES } from "../src/lib/ore-texture-bases";
import { ORE_TEXTURE_NAMES, isOreTexturePath, parseOreTexture, renderOreTexture, supportsOreTextureVersion } from "../src/lib/ore-textures";
import { artifactSystemPrompt } from "../src/lib/artifact-experts";
import { TexturePreviews } from "../src/components/texture-previews";
import { packageMinecraftPack } from "../src/lib/packager";
import { validateProject, validateRequest } from "../src/lib/validation";
import { generateArtifact } from "../src/lib/generation";
import { getArtifact } from "../src/lib/project-store";

const recipe = JSON.stringify({ style: "outlined", brightness: 1.8 });
const orePath = (name: string) => `assets/minecraft/textures/block/${name}.ore.json`;
const fixture = () => ({ name: "VisibleOres", files: [
  { path: "pack.mcmeta", content: JSON.stringify({ pack: { pack_format: 46, description: "High contrast ores without shaders" } }) },
  ...ORE_TEXTURE_NAMES.map(name => ({ path: orePath(name), content: recipe })),
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

test("all eighteen ore variants render deterministic, opaque PNGs without emissive maps", () => {
  assert.equal(ORE_TEXTURE_NAMES.length, 18);
  for (const name of ORE_TEXTURE_NAMES) {
    const image = renderOreTexture(orePath(name), recipe);
    assert.equal(image.path, `assets/minecraft/textures/block/${name}.png`);
    const rgba = decodePng(image.bytes);
    for (let i = 3; i < rgba.length; i += 4) assert.equal(rgba[i], 255, `${name} remains opaque`);
    assert.deepEqual(image.bytes, renderOreTexture(orePath(name), recipe).bytes);
    const brighter = decodePng(renderOreTexture(orePath(name), '{"style":"bright","brightness":2.5}').bytes);
    assert.notDeepEqual(rgba, brighter, `${name} supports distinct outlined and bright treatments`);
  }
});

test("ore recipes constrain names, paths, style, brightness and exact fields", () => {
  assert.equal(isOreTexturePath(orePath("diamond_ore")), true);
  assert.doesNotThrow(() => parseOreTexture(orePath("diamond_ore"), recipe));
  for (const content of ['null', '[]', '{}', '{', '{"style":"glow","brightness":1.8}', '{"style":"bright","brightness":0.9}', '{"style":"bright","brightness":2.6}', '{"style":"bright","brightness":null}', '{"style":"bright","brightness":1e309}', '{"style":"bright","brightness":true}', '{"style":"bright","brightness":"2"}', '{"style":"bright\\n","brightness":1.8}', '{"style":"bright","brightness":1.8,"url":"https://example.com"}', ' '.repeat(257)]) {
    assert.throws(() => parseOreTexture(orePath("diamond_ore"), content), content);
  }
  for (const path of [orePath("ancient_debris"), orePath("diamond_ore") + "\n", orePath("diamond_ore") + "\r", "assets/custom/textures/block/diamond_ore.ore.json", "assets/minecraft/textures/block/../diamond_ore.ore.json", "/" + orePath("diamond_ore")]) {
    assert.equal(isOreTexturePath(path), false, path);
    assert.throws(() => renderOreTexture(path, recipe));
  }
  for (const version of ["1.21.1", "1.21.4", "1.21.11"]) assert.equal(supportsOreTextureVersion(version), true);
  for (const version of [undefined, "1.20.4", "1.21.12", "1.21.4\n"]) assert.equal(supportsOreTextureVersion(version), false);
});

test("ore validation fails closed for unsupported recipes, fields and versions", () => {
  assert.doesNotThrow(() => validateProject(fixture(), "resource_pack", "vanilla", "1.21.4"));
  for (const path of [orePath("ancient_debris"), "assets/demo/textures/block/diamond_ore.ore.json", orePath("diamond_ore") + "\n"]) {
    const source = fixture(); source.files.push({ path, content: recipe });
    assert.throws(() => validateProject(source, "resource_pack", "vanilla", "1.21.4"));
  }
  const source = fixture(); source.files[1].content = '{"style":"outlined","brightness":50}';
  assert.throws(() => validateProject(source, "resource_pack", "vanilla", "1.21.4"));
  assert.throws(() => validateProject(fixture(), "resource_pack", "vanilla", "1.20.4"));
  assert.throws(() => packageMinecraftPack(fixture(), "resource_pack", "1.20.4"));
});

test("ore ZIP includes only opaque vanilla-path PNGs and excludes recipes or emissive configuration", () => {
  const packed = packageMinecraftPack(fixture(), "resource_pack", "1.21.4");
  const files = unzip(packed.artifact);
  assert.equal(JSON.parse(files["pack.mcmeta"].toString()).pack.pack_format, 46);
  assert.equal(Object.keys(files).length, 19);
  assert.equal(Object.keys(files).some(path => /\.ore\.json$|_e\.png$|_s\.png$|emissive|optifine/i.test(path)), false);
  for (const name of ORE_TEXTURE_NAMES) {
    const rgba = decodePng(files[`assets/minecraft/textures/block/${name}.png`]);
    for (let i = 3; i < rgba.length; i += 4) assert.equal(rgba[i], 255);
  }
});

test("an ore request generates and stores a texture ZIP without invoking the Java builder", async () => {
  const input = validateRequest({ prompt: "Make ores easier to spot underwater and in dark caves, without shaders.", artifactType: "resource_pack", target: "vanilla", version: "1.21.4" });
  let calls = 0;
  const project = await generateArtifact(input, { name: "Ore fixture", async generate() { calls++; return fixture(); } }, { async build() { throw new Error("Texture generation must not use Java compilation"); } });
  assert.equal(calls, 1);
  assert.equal(project.status, "success", project.error);
  assert.equal(project.artifactAvailable, true);
  const saved = getArtifact(project.id); assert.ok(saved);
  decodePng(unzip(saved.artifact)["assets/minecraft/textures/block/deepslate_diamond_ore.png"]);
});

test("ore previews use the identical packaged PNGs and reject malformed recipes", () => {
  const markup = renderToStaticMarkup(createElement(TexturePreviews, { files: fixture().files }));
  const previews = [...markup.matchAll(/src="data:image\/png;base64,([A-Za-z0-9+/=]+)"/g)];
  assert.equal(previews.length, 18);
  for (const [index, name] of ORE_TEXTURE_NAMES.entries()) {
    const expected = renderOreTexture(orePath(name), recipe);
    assert.deepEqual(Buffer.from(previews[index][1], "base64"), Buffer.from(expected.bytes));
  }
  assert.equal(renderToStaticMarkup(createElement(TexturePreviews, { files: [{ path: orePath("diamond_ore"), content: '{"style":"glow","brightness":1.8}' }] })), "");
});

test("short ore prompts receive recipe and shader-free visibility limitations", () => {
  const input = validateRequest({ prompt: "Make ores shine in dark caves and underwater, no shaders.", artifactType: "resource_pack", target: "vanilla", version: "1.21.4" });
  const prompt = artifactSystemPrompt(input);
  assert.ok(prompt.includes(".ore.json"));
  assert.ok(prompt.includes("deepslate_diamond_ore"));
  assert.match(prompt, /no true glow|not emit light|does not emit light|no light emission|NOT emissive/i);
  assert.match(prompt, /fog|darkness/i);
});


test("ore brightening preserves host rock and the outline only touches mineral-adjacent pixels", () => {
  for (const name of ORE_TEXTURE_NAMES) {
    const base = ORE_TEXTURE_BASES.textures[name];
    const bright = decodePng(renderOreTexture(orePath(name), '{"style":"bright","brightness":1.8}').bytes);
    const outlined = decodePng(renderOreTexture(orePath(name), recipe).bytes);
    const low = decodePng(renderOreTexture(orePath(name), '{"style":"bright","brightness":1}').bytes);
    const high = decodePng(renderOreTexture(orePath(name), '{"style":"bright","brightness":2.5}').bytes);
    let changedOre = 0, preservedRock = 0, changedOutline = 0;
    assert.equal(base.oreMask.length, 256);
    assert.match(base.oreMask, /^[01]+$/);
    for (let pixel = 0; pixel < 256; pixel++) {
      const original = [...base.palette[parseInt(base.pixels.slice(pixel * 2, pixel * 2 + 2), 16)]];
      const actual = [...bright.subarray(pixel * 4, pixel * 4 + 4)];
      const outline = [...outlined.subarray(pixel * 4, pixel * 4 + 4)];
      assert.equal(actual[3], original[3]);
      assert.equal(outline[3], original[3]);
      for (let channel = 0; channel < 3; channel++) {
        assert.ok(high[pixel * 4 + channel] >= low[pixel * 4 + channel], `${name} brightness is monotonic`);
      }
      if (base.oreMask[pixel] === "1") {
        if (actual.some((channel, i) => channel !== original[i])) changedOre++;
        assert.ok(Math.max(...actual.slice(0, 3)) >= Math.max(...original.slice(0, 3)));
        assert.deepEqual(outline, actual, `${name} outline leaves mineral shading alone`);
      } else {
        assert.deepEqual(actual, original, `${name} retains host grain at ${pixel}`);
        preservedRock++;
        const x = pixel % 16, y = Math.floor(pixel / 16);
        const neighbours = [x > 0 ? pixel - 1 : -1, x < 15 ? pixel + 1 : -1, y > 0 ? pixel - 16 : -1, y < 15 ? pixel + 16 : -1];
        if (!neighbours.some(n => n >= 0 && base.oreMask[n] === "1")) {
          assert.deepEqual(outline, original, `${name} outline stays within its cardinal mineral border`);
        } else if (outline.some((channel, i) => channel !== original[i])) changedOutline++;
      }
    }
    assert.ok(changedOre > 0 && preservedRock > 0 && changedOutline > 0, name);
  }
});
