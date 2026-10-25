import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ORE_TEXTURE_NAMES } from "../../src/lib/ore-textures";
import { packageMinecraftPack, resourcePackFormat } from "../../src/lib/packager";
import { validateProject } from "../../src/lib/validation";

// Authored offline example, explicitly separate from a live provider response.
const version = process.argv[3] || "1.21.4";
const files = [
  { path: "pack.mcmeta", content: JSON.stringify({ pack: { pack_format: resourcePackFormat(version), description: "Clear Ores - high contrast, no shaders required" } }) },
  ...ORE_TEXTURE_NAMES.map(name => ({ path: `assets/minecraft/textures/block/${name}.ore.json`, content: JSON.stringify({ style: "outlined", brightness: 1.8 }) })),
  { path: "README.md", content: `Clear Ores - authored visibility pipeline test for Minecraft ${version}.\nBrighter mineral patches with thin outlines on 18 stone, deepslate and Nether ore textures.\nThese textures do not glow or emit light. Darkness, underwater fog and block occlusion still apply.\nNo x-ray, transparency holes or lighting changes. Keep ordinary lighting available in dark caves.\nPlace this ZIP in resourcepacks and enable it above other ore-changing packs.\nMinecraft 1.21.4 base artwork: Mojang/Microsoft; contrast treatment: ModHorizon.\nNo provider request was made. Minecraft appearance requires testing.\n` },
];
const project = validateProject({ name: "ClearOres", files }, "resource_pack", "vanilla", version);
const output = resolve(process.argv[2] || "../outputs/ClearOres-test01.zip");
mkdirSync(dirname(output), { recursive: true });
const result = packageMinecraftPack(project, "resource_pack", version);
writeFileSync(output, result.artifact);
console.log(JSON.stringify({ output, version, pngTextures: ORE_TEXTURE_NAMES.length, bytes: result.artifact.length, providerCalls: 0 }));
