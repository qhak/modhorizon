import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ITEM_TEXTURE_NAMES } from "../../src/lib/item-textures";
import { packageMinecraftPack, resourcePackFormat } from "../../src/lib/packager";
import { validateProject } from "../../src/lib/validation";

// Offline authored fixture: exercises the same validation/rasterizer/ZIP path,
// without billing or claiming that a provider returned this project.
const version = process.argv[3] || "1.21.4";
const files = [
  { path: "pack.mcmeta", content: JSON.stringify({ pack: { pack_format: resourcePackFormat(version), description: "Cherry Diamond Tools - ModHorizon recolor test" } }) },
  ...ITEM_TEXTURE_NAMES.map(name => ({ path: `assets/minecraft/textures/item/${name}.recolor.json`, content: JSON.stringify({ color: "#a82040" }) })),
  { path: "README.md", content: `Cherry Diamond Tools - authored pipeline test for Minecraft ${version}.\nRecolors the diamond sword, pickaxe, axe, shovel and hoe. No armor or blocks.\nPlace this ZIP in resourcepacks and enable it above other packs.\nBase shapes: Minecraft 1.21.4 assets by Mojang; recolor by ModHorizon.\nNo provider request was made. Minecraft visual acceptance is pending.\n` },
];
const project = validateProject({ name: "CherryDiamondTools", files }, "resource_pack", "vanilla", version);
const output = resolve(process.argv[2] || "../outputs/CherryDiamondTools-test01.zip");
mkdirSync(dirname(output), { recursive: true });
const result = packageMinecraftPack(project, "resource_pack", version);
writeFileSync(output, result.artifact);
console.log(JSON.stringify({ output, version, pngTextures: ITEM_TEXTURE_NAMES.length, bytes: result.artifact.length, providerCalls: 0 }));
