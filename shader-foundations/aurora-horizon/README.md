# Aurora Horizon — candidate 02

Original ModHorizon shader foundation for Minecraft Java 1.21.11 / Iris 1.10.8.
Visual target: the owner's golden forest/lake and sunset village/water references.
No code from the depicted shader packs was copied. This is an experimental
candidate, not a verified equivalent to the reference images.

Candidate 02 corrects the Iris format metadata syntax that prevented candidate 01
from compiling. Format declarations are block-comment metadata; the driver checker
now compiles the source without supplying missing format definitions.

## Implemented source

- Directional sun/moon light and warm block light, separated from ambient sky.
- 2048px, 96-block, unwarped shadow mapping; nine comparisons soften edges.
- Consistent linear/HDR intermediate lighting and one final display transform.
- Depth-based contact occlusion plus vanilla vertex ambient occlusion.
- Golden/blue sky, procedural sun/moon and a soft animated 2D cloud layer.
- Water normals, view-angle Fresnel, 48-step screen-space reflections reaching
  about 144 blocks, depth rejection, binary refinement and sky fallback.
- Approximate shallow-water absorption/refraction, sunlight highlights, depth
  haze, screen-space light shafts and restrained highlight bloom.

These describe source code, not successful in-game acceptance. Driver compilation
does not establish correct Iris uniforms, buffer ordering, materials or appearance.

## Install and first test

Select AuroraHorizon-candidate-02.zip in the isolated ModHorizon Shader Test
profile. Keep the older generated and repaired packs for comparison.

1. First inspect a tree beside grass/stone at ground level, with the sun to one
   side. Sun-facing block faces should be distinctly brighter and warmer than
   shaded ones, and the tree should cast a recognisable shadow on the ground.
2. Inspect leaf cutouts, an entity, held item, torch and particles against sky.
3. View a lake from the shoreline at a grazing angle, with nearby trees/buildings
   in view. Check actual reflected shapes, shallow beds and glass separately.
4. Compare the same camera/time with the shader off. Then check sunset, noon,
   night, rain and underwater. Capture errors and FPS as observations.

## Known limits

- Overworld only is the acceptance target; Nether/End are untested.
- Screen-space reflections cannot recover offscreen or hidden scenery. 144
  blocks is ray travel, not a guarantee of reflected-object visibility.
- A single unblended translucent layer preserves the closest submitted surface;
  overlapping glass/water stacks are not fully accumulated. Refraction is an
  approximation. Transparent shadow tint is omitted; water/glass do not cast
  solid shadows. Other translucent blocks need testing.
- Clouds are a soft 2D layer and shafts are screen-space approximations, not
  volumetric rendering or ray tracing. There is no global illumination or PBR
  normal/roughness texture workflow. Vanilla block textures remain.
- Unwarped shadow coverage prioritises clarity close to the camera; finite
  distance, bias artefacts and modest fixed-filter softness need evaluation.
- Basic debug/line programs use Iris fallback. All preservation checks remain
  pending actual game tests.

## Reuse and look controls

Keep pass order, buffer mapping, material IDs, colour-space conversion and
shadow transforms intact. The six look macros at the top of shaders/lib/common.glsl
control sun intensity, shadow fill, fog, waves, bloom and exposure. The AI should
map reference observations to these bounded controls first. Architectural edits
need compilation and repeatable in-game tests before promotion.

See the repository's docs/aurora-horizon-foundation.md for the buffer contract,
primary sources, validation evidence and promotion gate. Do not describe this
candidate as tested training ground truth until the acceptance record passes.
