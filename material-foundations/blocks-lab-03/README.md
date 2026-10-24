# BlocksLab materials 03

Original 512px procedural oak/spruce/birch bark and leaf textures with matching
normal/surface maps. Leaf shapes are neutral grayscale with RGBA cutout gaps;
Minecraft supplies biome/species tint. Transparent pixels retain non-black colour
to reduce dark filtering fringes. Normals/height share their material field.
Other candidate02 materials, including sand and log ends, are byte-for-byte unchanged.

Enable above materials02 and select BlocksLab-candidate-03. Use See-Through Leaves
for Minecraft 1.21.11, or the equivalent foliage-quality option in your client.
Inspect bark in sunlight and shade, rotated logs, leaf gaps against the sky, leaf
shadows, canopy interiors, biome tint, repetition and mip/distance shimmer.
This is not a photo scan, a 3D leaf model, wind animation or subsurface scattering.
Other tree species/plants stay vanilla; new appearance is not yet owner-approved.
Rebuild with scripts/shaders/build-bark-leaves.py (numpy + Pillow).

Transparency setting reference, checked 2026-10-24:
https://feedback.minecraft.net/hc/en-us/articles/41809981427213-Minecraft-Java-Edition-1-21-11-Mounts-of-Mayhem
