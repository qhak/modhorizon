# Item texture recolors - 2026-10-25

The previous resource expert accepted only text assets and explicitly told the
model to describe missing PNGs in README. A tools/armor recolor request could
therefore return metadata/README without any assets, which correctly failed
validation. It could not produce the promised visual resource pack.

## First supported slice

Select Resource Pack, Vanilla, Minecraft 1.21.1 through 1.21.11. The model chooses
colors for diamond sword, pickaxe, axe, shovel and hoe. It returns text recipes
at `assets/minecraft/textures/item/<item>.recolor.json`, each with exactly
`{"color":"#a82040"}`. The server renders real 16x16 RGBA PNGs at the corresponding
vanilla `.png` paths and excludes recipes from the installed ZIP. Editable source
retains the recipes for follow-up generation and saved projects. Root metadata
uses the selected release's existing server-owned compatibility table.

Only diamond-colored palette entries are recolored. Source silhouettes, alpha,
wooden handles, facets and shade variation are retained. No raw binary/base64,
arbitrary remote URLs, canvas code or user-selected filesystem access is accepted
from the model. Recipe names, keys, size and color syntax are bounded. Unsupported
recipes fail closed; missing assets are never synthesized as empty placeholders.

The pure TypeScript renderer has no native dependency or runtime download. The
workspace previews use that exact renderer, so they depict the PNG bytes in the
ZIP and remain available from saved text source even after download expiry.

The fixed bases are from the official Mojang 1.21.4 client; they are vanilla
artwork, not generated art. Provenance and hashes are in `item-texture-bases.ts`.
`python scripts/textures/prepare-item-textures.py --client-jar <official-client.jar>`
reproduces the compact source data with pinned JAR/hash and PNG CRC checks. The
five stable item paths are reused on the selected 1.21.x versions; cross-version
appearance has not been tested in every client. Mojang owns the source artwork.

## Honest scope and test

Worn armor, blocks, new silhouettes, photorealistic assets, arbitrary image uploads
and additional materials are not implemented. Model instructions require visible
message/README omissions for mixed requests. Text-only resource features remain
available on other versions. This is prompted planning plus deterministic
rasterization, not model fine-tuning or a general image model.

Use a short test prompt: “Make my diamond sword, pickaxe, axe, shovel and hoe dark
cherry red, keeping the classic Minecraft pixel style.” Check the texture previews,
then enable the ZIP above other packs and inspect all five tools in inventory and
in-hand. Confirm handles stay brown, transparent edges have no background and
unrelated textures stay unchanged. Armor should remain vanilla.

`npx tsx scripts/textures/package-item-example.ts <output.zip> 1.21.4` creates an
explicitly authored offline sample through the same validator and packager. It
does not prove that a live provider follows the new instructions. Tests decode
actual PNG chunks/zlib/CRC, inspect original alpha/handle pixels and shaded colors,
read ZIP entries and exercise generation/storage with a fixture provider. Full
Minecraft visual acceptance and a fresh billable model pass remain separate checks.

## Owner acceptance - 2026-10-25

The owner generated and downloaded DarkCherryDiamondTools through the local app.
Archive inspection confirmed format 46 and five valid 16x16 RGBA PNGs with no
internal recipes. After installation, the owner reported “works well”; their
screenshot showed the cherry-red sword in hand and all five recolored tool icons
in the hotbar. This establishes that specific pack's prompt-to-gameplay success,
not armor, original artwork or every selected game version.
