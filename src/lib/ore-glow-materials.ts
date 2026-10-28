import { ORE_TEXTURE_BASES } from "./ore-texture-bases";
import { ORE_TEXTURE_NAMES, renderOreTexture, supportsOreTextureVersion } from "./ore-textures";
import { encodePng16 } from "./item-textures";
import { resourcePackFormat } from "./packager";

/** Authored companion assets for the experimental OreGlow shader, not a new model recipe. */
export function oreGlowMaterialFiles(version: string): { path: string; bytes: Uint8Array }[] {
  if (!supportsOreTextureVersion(version)) throw new Error("OreGlow materials require Minecraft 1.21.1–1.21.11.");
  const text = (path: string, content: string) => ({ path, bytes: new TextEncoder().encode(content) });
  const files: { path: string; bytes: Uint8Array }[] = [text("pack.mcmeta", JSON.stringify({ pack: {
    pack_format: resourcePackFormat(version), description: "OreGlow Materials - pair with OreGlow-test02 shader",
    ...(Number(resourcePackFormat(version)) >= 65 ? { min_format: [resourcePackFormat(version), 0], max_format: [resourcePackFormat(version), 0] } : {}),
  } }, null, 2)), text("assets/minecraft/optifine/texture.properties", "format=lab-pbr/1.3\n"),
  text("README.md", `# OreGlow Materials - test02\n\nAuthored companion for the OreGlow-test02 shader on Minecraft ${version}.\nEnable this resource pack above ClearOres-test01 and other ore packs. Select\nOreGlow-test02 in Iris/OptiFine. Without a shader that reads these emission maps,\nthis is only a brighter ore texture pack. It does not change vanilla block light.\n\n18 vanilla mineral masks are encoded in the LabPBR specular-map alpha channel:\n254 for mineral pixels, 0 for host rock. The albedo PNGs remain fully opaque.\nAlpha 255 is reserved by LabPBR for no emission; these generated maps do not use it.\nThe shader reads emission only, not full physically based material shading.\n\nSelf-bright surfaces and a screen-space halo do not cast light onto nearby blocks,\nreveal hidden ores or remove underwater fog. In-game appearance remains unverified.\nBase artwork: Mojang/Microsoft, pinned official Minecraft 1.21.4 assets.\nSources: https://shaders.properties/current/how-to/pbr_standards/ and\nhttps://shaderlabs.org/wiki/LabPBR_Material_Standard\nNo provider call was made to build this authored example.\n`)];
  for (const name of ORE_TEXTURE_NAMES) {
    const base = ORE_TEXTURE_BASES.textures[name];
    const albedo = renderOreTexture(`assets/minecraft/textures/block/${name}.ore.json`, '{"style":"bright","brightness":1.3}');
    const material = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < 256; i++) {
      // Matte dielectric RGB defaults; only the alpha emission channel is used by OreGlow.
      material.set([0, 10, 0, base.oreMask[i] === "1" ? 254 : 0], i * 4);
    }
    files.push({ path: albedo.path, bytes: albedo.bytes },
      { path: `assets/minecraft/textures/block/${name}_s.png`, bytes: encodePng16(material) });
  }
  return files;
}
