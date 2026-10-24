# BlocksLab candidate 01

Separate block-material experiment, derived from Aurora candidate03. Enable
BlocksLab-materials-01.zip in Resource Packs AND this ZIP in Iris Shader Packs.
The high-resolution albedo removes the coarse vanilla texture pattern on sand,
stone and oak planks; the companion normal/smoothness maps shape their lighting.
Other block textures remain vanilla. Block silhouettes remain cubes.

Only these three dielectric material fixtures decode maps. This is a LabPBR
subset, not general LabPBR compliance; no POM, true displacement, metal decoding,
porosity or global illumination. Normal detail fades with distance. Remove the
resource pack to compare the texture contribution; set LAB_NORMAL_STRENGTH=0
to compare surface normals. Test flat/rotated/mirrored faces in low sunlight,
torch/night light, underwater, and at distance for shimmer and atlas bleeding.

Water root files, the shared sky function and the non-terrain lightSurface path
are inherited unchanged from Aurora. This does not establish game equivalence
or visual acceptance. No paid generation was used. Select only ONE shader ZIP;
Minecraft does not stack BlocksLab, CleanSkyLab and Aurora shader packs.
