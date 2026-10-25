# Blocks Lab 01 materials

Experimental original procedural sand, stone and oak-plank materials, each
512x512. No vanilla textures, external photographs or generated image API calls.
Albedo, tangent normal and normalized height share a periodic source field.
The _n and _s channels follow LabPBR 1.3; this pack provides no metallic materials,
emission or baked AO. Height is stored for inspection; the companion shader does
not implement parallax or displacement. Porosity is stored but not rendered.

Install this ZIP in resourcepacks and enable it ABOVE other texture packs.
Use BlocksLab-candidate-01 in the Iris shader menu for the normal/roughness test.
With AuroraHorizon-candidate-03 the new colour textures still work, but Aurora
does not decode these material maps. Only sand, stone and oak_planks change;
red sand, sandstone, other woods, items and all other blocks retain their assets.
This is a material prototype, not a full realistic texture pack or photo scan.

At fixed time and camera compare a sand beach, stone wall and oak-plank wall:
first no resource pack, then this resource pack, then the companion shader.
Check one-block closeups, large tiled surfaces, rotated faces, shadows, torch/night
light, underwater sand and texture-pack removal. Look for visible repeat seams,
incorrect tangent handedness, glitter at distance and shiny/plastic sand.
The block silhouettes remain cubes. Visual acceptance and performance are pending.

Rebuild with scripts/shaders/build-material-lab.py (numpy + Pillow).
Standards checked 2026-10-24:
https://shaderlabs.org/wiki/LabPBR_Material_Standard
https://shaders.properties/current/how-to/pbr_standards/
