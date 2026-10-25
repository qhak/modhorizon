import { ITEM_TEXTURE_BASES } from "./item-texture-bases";

export const ITEM_TEXTURE_NAMES = ["diamond_sword", "diamond_pickaxe", "diamond_axe", "diamond_shovel", "diamond_hoe"] as const;
type ItemTextureName = typeof ITEM_TEXTURE_NAMES[number];
const RECOLOR_PATH = /^assets\/minecraft\/textures\/item\/(diamond_sword|diamond_pickaxe|diamond_axe|diamond_shovel|diamond_hoe)\.recolor\.json(?![\s\S])/;

export function supportsItemRecolorVersion(version: string | undefined): boolean {
  return typeof version === "string" && /^1\.21\.(?:[1-9]|10|11)(?![\s\S])/.test(version);
}

export const ITEM_RECOLOR_INSTRUCTIONS = `For vanilla diamond tool recolors, emit actual texture recipes instead of describing PNGs in a README. Supported item names: ${ITEM_TEXTURE_NAMES.join(", ")}. Each file must be assets/minecraft/textures/item/<item>.recolor.json containing exactly {"color":"#a82040"}, with a six-digit RGB hex color. The packager turns these recipes into real 16x16 PNGs using verified Minecraft 1.21.4 tool shapes, preserving transparency and wooden handles. Supported selected versions are 1.21.1 through 1.21.11, reusing the 1.21.4 bases at their stable item texture paths. Recipes are build inputs and are not included in the downloaded pack. This release does not generate worn armor, custom drawings, or arbitrary block textures. Do not claim unsupported textures were produced.`;

export function isItemRecolorPath(path: string): boolean {
  return RECOLOR_PATH.test(path);
}

export function parseItemRecolor(path: string, content: string): { name: ItemTextureName; color: string } {
  const match = RECOLOR_PATH.exec(path);
  if (!match) throw new Error("Unsupported item texture recipe path. Use a supported vanilla diamond tool.");
  if (typeof content !== "string" || content.length > 256) throw new Error("Item texture recipe must be at most 256 characters.");
  let value: unknown;
  try { value = JSON.parse(content); } catch { throw new Error("Item texture recipe must be valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Item texture recipe must be an object containing only color.");
  const recipe = value as Record<string, unknown>;
  if (Object.keys(recipe).length !== 1 || typeof recipe.color !== "string" || !/^#[a-fA-F0-9]{6}(?![\s\S])/.test(recipe.color)) {
    throw new Error("Item texture recipe must contain only color as a six-digit RGB hex value, such as #a82040.");
  }
  return { name: match[1] as ItemTextureName, color: recipe.color.toLowerCase() };
}

// Small fixed-size PNG encoder, using uncompressed DEFLATE. Works in Node and Workers.
function concat(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function u32(value: number): Uint8Array {
  return new Uint8Array([value >>> 24, value >>> 16 & 255, value >>> 8 & 255, value & 255]);
}

function chunk(kind: string, data: Uint8Array): Uint8Array {
  const body = concat([new TextEncoder().encode(kind), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return concat([u32(data.length), body, u32((crc ^ 0xffffffff) >>> 0)]);
}

export function encodePng16(rgba: Uint8Array): Uint8Array {
  if (rgba.length !== 16 * 16 * 4) throw new Error("Texture encoder requires exactly 16×16 RGBA pixels.");
  const scanlines = new Uint8Array(16 * 65);
  for (let row = 0; row < 16; row++) scanlines.set(rgba.subarray(row * 64, row * 64 + 64), row * 65 + 1);
  let a = 1, b = 0;
  for (const byte of scanlines) { a = (a + byte) % 65521; b = (b + a) % 65521; }
  const len = scanlines.length;
  const zlib = concat([new Uint8Array([0x78, 0x01, 0x01, len & 255, len >>> 8, (~len) & 255, ((~len) >>> 8) & 255]), scanlines, u32((b << 16 | a) >>> 0)]);
  return concat([
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", concat([u32(16), u32(16), new Uint8Array([8, 6, 0, 0, 0])])),
    chunk("IDAT", zlib), chunk("IEND", new Uint8Array()),
  ]);
}

export function renderItemRecolor(path: string, content: string): { path: string; bytes: Uint8Array } {
  const { name, color } = parseItemRecolor(path, content);
  const base = ITEM_TEXTURE_BASES.textures[name];
  const target = [1, 3, 5].map((offset) => parseInt(color.slice(offset, offset + 2), 16));
  const diamondPalette = new Set<number>(base.diamondPalette);
  const palette = base.palette.map((entry, index) => {
    if (!diamondPalette.has(index)) return [...entry];
    // Retain the source's dark teal outlines and bright gemstone facets.
    const brightness = Math.max(entry[0], entry[1], entry[2]) / 255;
    return [...target.map((channel) => Math.round(channel * brightness)), entry[3]];
  });
  const rgba = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) rgba.set(palette[parseInt(base.pixels.slice(i * 2, i * 2 + 2), 16)], i * 4);
  return { path: path.replace(/\.recolor\.json$/, ".png"), bytes: encodePng16(rgba) };
}
