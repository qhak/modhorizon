import { encodePng16 } from "./item-textures";
import { ORE_TEXTURE_BASES } from "./ore-texture-bases";

export const ORE_TEXTURE_NAMES = [
  "coal_ore", "iron_ore", "copper_ore", "gold_ore", "redstone_ore", "emerald_ore", "lapis_ore", "diamond_ore",
  "deepslate_coal_ore", "deepslate_iron_ore", "deepslate_copper_ore", "deepslate_gold_ore",
  "deepslate_redstone_ore", "deepslate_emerald_ore", "deepslate_lapis_ore", "deepslate_diamond_ore",
  "nether_gold_ore", "nether_quartz_ore",
] as const;
type OreTextureName = typeof ORE_TEXTURE_NAMES[number];
const ORE_PATH = /^assets\/minecraft\/textures\/block\/([a-z_]+)\.ore\.json(?![\s\S])/;

export const ORE_TEXTURE_INSTRUCTIONS = `For shader-free ore visibility, emit assets/minecraft/textures/block/<ore>.ore.json containing exactly {"style":"outlined","brightness":1.8}. Supported ore names: ${ORE_TEXTURE_NAMES.join(", ")}. style is bright or outlined; brightness is a finite number from 1 to 2.5. Use outlined for a thin pale mineral outline, or bright for mineral patches without an outline. For a general ores request include all 18 supported normal, deepslate and Nether variants unless the user narrows it. The server renders real opaque 16x16 PNGs from verified vanilla 1.21.4 bases for selected versions 1.21.1 through 1.21.11. Only exposed ore faces are changed. This is higher-contrast artwork, NOT emissive/fullbright textures, dynamic light, x-ray, night vision or a fog bypass. Unlit caves can still look dark and underwater fog still limits visibility. State this prominently in message and README. Do not claim ore blocks shine without light, reveal hidden ore or require a shader. No ancient debris or modded ore textures are supported.`;

export function supportsOreTextureVersion(version: string | undefined): boolean {
  return typeof version === "string" && /^1\.21\.(?:[1-9]|10|11)(?![\s\S])/.test(version);
}

export function isOreTexturePath(path: string): boolean {
  const match = ORE_PATH.exec(path);
  return !!match && (ORE_TEXTURE_NAMES as readonly string[]).includes(match[1]);
}

export function parseOreTexture(path: string, content: string): { name: OreTextureName; style: "bright" | "outlined"; brightness: number } {
  const match = ORE_PATH.exec(path);
  if (!match || !(ORE_TEXTURE_NAMES as readonly string[]).includes(match[1]))
    throw new Error("Unsupported ore texture recipe path. Use a supported vanilla ore or deepslate variant.");
  if (typeof content !== "string" || content.length > 256) throw new Error("Ore texture recipe must be at most 256 characters.");
  let value: unknown;
  try { value = JSON.parse(content); } catch { throw new Error("Ore texture recipe must be valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ore recipe must contain exactly style and brightness.");
  const recipe = value as Record<string, unknown>;
  if (Object.keys(recipe).length !== 2 || !Object.hasOwn(recipe, "style") || !Object.hasOwn(recipe, "brightness")
    || (recipe.style !== "bright" && recipe.style !== "outlined")
    || typeof recipe.brightness !== "number" || !Number.isFinite(recipe.brightness) || recipe.brightness < 1 || recipe.brightness > 2.5)
    throw new Error("Ore recipe needs only style (bright or outlined) and brightness (1 to 2.5).");
  return { name: match[1] as OreTextureName, style: recipe.style, brightness: recipe.brightness };
}

export function renderOreTexture(path: string, content: string): { path: string; bytes: Uint8Array } {
  const recipe = parseOreTexture(path, content);
  const base = ORE_TEXTURE_BASES.textures[recipe.name];
  const rgba = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < 256; i++) {
    const original = base.palette[parseInt(base.pixels.slice(i * 2, i * 2 + 2), 16)];
    let rgb: readonly number[] = original;
    if (base.oreMask[i] === "1") {
      const peak = Math.max(original[0], original[1], original[2]);
      // A restrained readability floor lifts dark coal while retaining its grain.
      const targetPeak = Math.min(255, Math.max(132 + peak * 0.30, peak * recipe.brightness));
      rgb = original.slice(0, 3).map(channel => Math.round(channel * targetPeak / Math.max(peak, 1)));
    } else if (recipe.style === "outlined") {
      const x = i % 16, y = Math.floor(i / 16);
      // In-bounds four-neighbour ring; no UV wrap or block-face transparency.
      const neighbours = [x > 0 ? i - 1 : -1, x < 15 ? i + 1 : -1, y > 0 ? i - 16 : -1, y < 15 ? i + 16 : -1];
      if (neighbours.some(index => index >= 0 && base.oreMask[index] === "1"))
        rgb = [240, 238, 211].map((channel, index) => Math.round(original[index] * 0.28 + channel * 0.72));
    }
    rgba.set([rgb[0], rgb[1], rgb[2], original[3]], i * 4);
  }
  return { path: path.replace(/\.ore\.json(?![\s\S])/, ".png"), bytes: encodePng16(rgba) };
}
