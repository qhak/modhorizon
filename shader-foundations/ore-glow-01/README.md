# OreGlow - test01

Authored candidate copied from the retained sunset04 shader. Enable the matching
OreGlowMasks resource pack ABOVE ClearOres, then select this shader in Iris or
OptiFine. Only mineral pixels of the 18 mapped ores use companion specular alpha
for self brightness. Without those maps, ores should retain ordinary lighting.
Stone stays normally shaded. Existing sky, water and reflection algorithms remain.

Small screen-space glow is separate from the self-bright mineral floor. It uses a
cleared emission attachment, opaque depth ordering and overlay-alpha suppression.
This does not reveal ores behind stone or emit dynamic light onto nearby blocks.
Underwater self brightness is attenuated with distance and existing water layers.
The shader reads LabPBR emission alpha only; full LabPBR material support is not
claimed. Default no-map alpha255 is ignored; alpha254 means maximum emission.

Test the iron tunnel first at low light, then diamond/redstone, deepslate and Nether
ores. Check a stone face covering ore, held opaque items, water surface/underwater,
day/night/rain and the far horizon. Use shader settings to reduce glow strength or
halo. Companion PNG/GLSL and synthetic GPU tests do not prove actual Iris runtime
appearance. Game visual acceptance and FPS remain pending. No provider call or
deployment was used. Prior shader and resource packs are retained separately.
