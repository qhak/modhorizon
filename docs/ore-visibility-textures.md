# Shader-free ore visibility - 2026-10-25

The owner requested ores that stand out underwater and in caves, then explicitly
chose higher contrast without shaders, accepting that this is not true glow.
This resource-pack feature brightens mineral pixels and optionally outlines them.
It does not emit light, remain full-bright in total darkness, bypass water fog,
show covered ores, change block geometry, or add transparency holes.

## Generated contract

For selected releases 1.21.1 through 1.21.11, a recipe at
`assets/minecraft/textures/block/<ore>.ore.json` contains exactly
`{"style":"outlined","brightness":1.8}`. Style is `bright` or `outlined`;
brightness must be a finite number between 1 and 2.5. Only the fixed catalog of
18 vanilla ores is accepted: coal, iron, copper, gold, redstone, emerald, lapis
and diamond in stone and deepslate, plus Nether gold and Nether quartz.
Recipes are editable project source; the ZIP contains the corresponding real
16x16 `.png` images, not internal recipes. Existing text resources and diamond-tool
recolors are retained. Shader and emissive configuration are not added.

The engine uses verified vanilla bases, fixed mineral masks and a pure TypeScript
PNG encoder. Runtime generation does not fetch model-supplied URLs or accept image
binaries, shaders, script execution, arbitrary dimensions or custom output paths.
Opaque source alpha is retained. The workspace preview calls the same renderer
as packaging. Prompts and output logs state the lighting/fog limitations.
Provenance and regeneration instructions are in `ore-texture-bases.ts` and
`scripts/textures/prepare-ore-textures.py`.

## Acceptance

Test with: “Make exposed ores brighter and outlined so they stand out in caves
and underwater, without shaders.” Choose Resource Pack, Vanilla and 1.21.4 first.
Inspect stone and deepslate diamond, iron, coal and copper beside unmodified host
blocks, then Nether ores. Check different light levels and a shallow underwater
wall, plus adjacent ore blocks and tile borders. In total darkness these textures
still darken normally; use ordinary lighting. Ores behind stone should stay hidden.

`npx tsx scripts/textures/package-ore-example.ts <output.zip> 1.21.4` creates an
explicitly authored offline sample. It is not evidence of a successful live model
request or Minecraft visual acceptance. Automated PNG/ZIP checks and a fixture
generation pass are separate from the owner's in-game test. The previously
accepted cherry-red tool pack remains a separate retained test.
