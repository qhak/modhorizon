# Golden Hour Reflective Horizon

An Iris shader source project for Minecraft 1.21.11. The look is based on the supplied references: a low warm sun, a cooler upper sky, distant atmospheric fade, clouds, and landscape reflected in water. It combines a procedural time/weather-aware sky, directional terrain lighting with a shadow pass, and a bounded screen-space reflection path.

## Important limits

This project supplies GLSL and text configuration only. It does **not** include generated PNGs or detailed block albedo textures. Better-lit vanilla blocks may have stronger face contrast, but this cannot make pixelated sand, stone, or wood photo-detailed. Install a compatible detailed resource pack for that result. Normal/specular texture atlas support is not included.

The custom sky includes a 2D noise cloud layer, procedural celestial discs/stars, and distance-based terrain haze. It is not volumetric cloud rendering, volumetric scattering, bloom, or occlusion-aware sun shafts. The original cloud geometry may remain faintly visible with its native silhouette. Water SSR can only reflect opaque scene pixels visible in the current frame; off-screen and occluded objects fall back to the shared sky radiance. Water transmission and refraction are approximations. Celestial textures are not faithfully retained in clear-depth background pixels; the shared sky instead supplies procedural sun, moon, and stars.

## Install

1. Place this project in a shader-pack folder/archive accepted by Iris, keeping the `shaders/` directory at its root.
2. Use Iris with Minecraft 1.21.11 and select the pack in Video Settings → Shader Packs.
3. For the intended block surface detail, separately install a compatible resource pack. This shader does not create or replace its textures.

## Rendering design

- Terrain and supported cutout terrain retain atlas UVs, vertex tint, alpha testing, biome color, and transformed lightmap UVs. Lightmap sky/block exposure is decoded from the lightmap coordinates; combined lightmap RGB is never incorrectly split into separate channels. Direct light and shadow receivers use player-space normals and positions consistently.
- `shadow.vsh` uses the shadow pass transforms unmodified with `ftransform()`. Its fragment stage alpha-tests texture coverage so leaves and other cutouts can cast shaped shadows.
- `sky_common.glsl` owns shared sky uniforms and the radiance function. `gbuffers_skybasic`, deferred clear-depth restoration, composite restoration, and water reflection fallback use that same palette and world-direction convention.
- Deferred copies the opaque scene into `colortex4`, substituting shared sky radiance only where `depthtex1` is clear. The buffer uses RGBA16F. Water SSR reads that snapshot and opaque depth, not a scene-color alias in a G-buffer stage.
- Water is identified by the `block.properties` mapping, separate from lava and other translucent terrain. `colortex1` is RGBA16F and explicitly cleared to transparent. Translucent passes output straight alpha; configured source-over blending accumulates premultiplied color in the layer. Composite adds that premultiplied layer over the opaque scene and restores the shared sky at clear depth.
- `lightmap.glsl` owns the `lightmap` sampler. `sky_common.glsl` owns shared matrices and sky uniforms. The design keeps block/entity lightmap fallback separate from terrain directional lighting.

## Acceptance checks (not run)

These are manual in-game checks, not claims that compilation or visual testing has occurred.

- **Shader toggle:** Stand at the same location and keep time/weather fixed; toggle the pack. Terrain should retain geometry, foliage, hand, entities, particles, and weather. Failure signs include missing leaves, vanished translucent objects, or a white/black background after toggling.
- **Day and night:** Compare lit and shaded perpendicular stone faces at daytime. A tree or building should produce a visible cast-shadow boundary that moves with the sun; direct light should warm toward low sun, while night and torch-lit shade remain readable. If all faces have equal brightness, or there is no occluder shadow, the lighting path is not behaving as intended.
- **Water and glass:** Put a recognizable tree or building beside a lake and inspect both a grazing and downward view. The visible object should contribute to a reflection when it is on-screen; the reflection should change with camera angle and the surface should retain shallow-bed visibility. Check glass separately, plus overlapping translucent objects and a frame with no water. Failure signs include a white overlay, glass treated as water, stuck reflections, or no recognizable nearby object in the reflected scene.
- **Sky and clouds:** Inspect day, sunset, and night, including stars and cloud layers. The horizon should transition without a hard band, low sunlight should become warm, rain should mute the palette, and the custom 2D clouds should appear in the clear-depth background and reflection fallback. Check whether native cloud geometry causes a visible second/block-shaped layer.
- **Textures:** Compare sand, stone, and wood with and without a detailed resource pack. Lighting can add face contrast and shadow, but surface detail should only increase when the installed pack supplies richer albedo assets.

## Status

The source has not been compiled, linked, GPU-tested, or visually accepted in Iris. Source and packaging do not establish runtime bindings, performance, or reference fidelity.

## Local checked copy, 2026-10-25

This is not the untouched AI output. Codex corrected two runtime interface/space
issues after its successful first-pass compile: replace unconfigured viewSize
with Iris viewWidth/viewHeight, and return actual world-up (0,1,0) in the shared
world-space sky helper. The original ZIP is preserved as GoldenHourReflectiveHorizon.zip.
Algorithms, materials and model feature claims otherwise remain unchanged.
The checked source compiles locally; Minecraft appearance remains unverified.
Test camera pitch at fixed time and water reflections beside a tree/building.
