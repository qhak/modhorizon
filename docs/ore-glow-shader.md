# OreGlow shader + companion resource pack - 2026-10-25

The owner tested the shader-free outlined ore pack and supplied a close-up of
iron, then requested a shader as well. This separate authored candidate adds
self-bright mineral patches and a bounded screen-space halo; the original
shader-free pack remains unchanged.

## Two packs required

`OreGlow-test01.zip` belongs in shaderpacks; `OreGlowMaterials-test01.zip` belongs
in resourcepacks. Enable the material pack above ClearOres and any other ore
texture pack, then select OreGlow in Iris/OptiFine. Test Minecraft 1.21.4 first.
The companion contains 18 opaque albedo textures and 18 `_s.png` specular maps.
Its `assets/minecraft/optifine/texture.properties` declares `format=lab-pbr/1.3`.
The shader reads the standard `specular` atlas using the terrain UVs.

LabPBR emission uses specular alpha 0 through 254; 255 is a no-emission sentinel.
The generated maps set mineral pixels to 254 and surrounding host rock to 0.
The block-ID gate additionally restricts decoding to the 18 mapped ore variants.
No alpha/transparency change is applied to the visible block textures. Without
the companion or a compatible emission map, the shader retains ordinary lighting.
Only the emission portion of LabPBR is used; this is not a full PBR implementation.

Sources: [Iris PBR atlas documentation](https://shaders.properties/current/how-to/pbr_standards/),
[LabPBR channel standard](https://shaderlabs.org/wiki/LabPBR_Material_Standard), and
[OptiFine texture.properties](https://github.com/sp614x/optifine/blob/master/OptiFineDoc/doc/texture.properties).

## Scope and verification

This is not dynamic light propagation: nearby stone is not illuminated by the
ore, ores behind solid geometry remain hidden, and underwater attenuation still
applies. Halo output is screen-space post-processing and can soften edges. Raw
driver compilation and controlled GLSL samples do not prove Iris attachment
ordering, material atlas binding, underwater appearance or performance in Minecraft.

Check the same iron wall in daylight and low light, with and without the companion.
The mineral pixels should retain brightness while host stone darkens. Check
diamond, coal, deepslate variants and Nether ores. Pan a solid wall/held item in
front of visible ore to check that masks do not leak or trail across opaque objects.
Test the shallow underwater scene, ordinary glass, and the previous sky/water look.
Reload resource packs and shaders after changing the material pack.

The build scripts reproduce the shader and materials from retained authored
source and verified vanilla masks. No provider generation or production deployment
is involved. The candidate is not promoted into a visually accepted ModHorizon
example until the owner completes the in-game test.
