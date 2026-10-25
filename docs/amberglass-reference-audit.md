# AmberglassReflections: reference fidelity audit

Date: 2026-10-25. Source: unchanged downloaded AmberglassReflections.zip,
27 entries, 15,274 bytes. SHA256:
`b5cd2da4d0a706a78a429c114b15b1dc7420ec5e0b457e13483394fa682241df`.
Request: realistic appearance from forest-lake sunset and village-water images,
with reflective water, natural clouds, warm sunlight and detailed-looking blocks.
Owner screenshot: result is usable but substantially short of the references;
owner said "I don't think it's bad but idk". Do not record this as rejection of
all effects or acceptance of reference fidelity.

## Findings

| Requested result | Actual source evidence | Assessment |
| --- | --- | --- |
| Shaped natural clouds | gbuffers_clouds.fsh samples the vanilla texture, multiplies colour and applies fog; vertex stage uses unchanged ftransform geometry. Plan explicitly calls this a restrained vanilla tint. | The silhouette cannot become rounded reference clouds from this implementation. This is a deliberate approximation, not a compiler failure. |
| Continuous cinematic sky | gbuffers_skybasic.fsh adds small warm radiance to gl_Color and uses saturation-based skyMask; no fullscreen custom sky. Clouds and water use different sky/fog logic. | Hard horizon is visible in the screenshot. Source retains vanilla geometry/colours; the exact seam's runtime cause has not been isolated. |
| Landscape reflections | water_reflections.glsl has a 40-step view-space trace, depth crossing, five bisections, separation test and colortex4 scene lookup with edge/distance fallback. deferred supplies that snapshot; composite mixes the premultiplied overlay. | Actual SSR code exists. The ocean-facing screenshot has few nearby on-screen objects to reflect, so it cannot establish success or failure of recognizable landscape reflection. Requires controlled shoreline test. |
| Natural water ripples | water_fragment.glsl uses two axis-aligned cosine terms. Position named worldPos is inverse-modelview player-relative position without cameraPosition. | Repetition is visible. Camera-relative phase is a source-level risk for swimming during translation; game confirmation pending. No new water algorithm was installed by this audit. |
| Correct light response | terrain_fragment.glsl and water_fragment.glsl interpret texture2D(lightmap, UV).rg as separate sky/block exposures. | Vanilla sampled RGB is combined light colour, not those independent levels. Decode normalized lightmap UV exposure or retain RGB lighting. This can distort daylight/torch separation even though GLSL compiles. |
| Consistent cloud sunset | clouds.fsh dots normalized view-space sunPosition with fixed (0,1,0), while terrain/sky use transformed world-up. | Cloud sun elevation depends on camera rotation. New bounded source warning catches this exact pattern; it does not simulate the renderer. |
| Coherent shadow offset | terrain_lighting.glsl offsets playerPosition with normal; caller's normal is gl_NormalMatrix-transformed view-space normal. | Mixed-space normal offset needs conversion before adding to the player-space position. Actual shadow quality still requires a receiver/occluder test. |
| Matching reflected sky | mhWaterSky uses fixed blue/orange gradients and sun alignment, but no solar-elevation/day/night or rain/cloud model. | Approximate fallback cannot track the visible sky across time/weather. It is not proof that the trace is absent. |
| Detailed blocks | README explicitly discloses no albedo/normal/specular assets; terrain still samples installed atlas. | Expected asset boundary. Lighting cannot generate missing texture detail. Companion image asset generation remains unavailable. |

## What this establishes

Unchanged source compiles 16 stages and links eight programs on the local NVIDIA
OpenGL driver. It includes substantial real algorithms, but chooses low-fidelity
sky/cloud approximations and has semantic errors that compile successfully.
Source size and speed are not useful acceptance criteria. This audit does not
isolate model capability: there is no controlled alternative-model comparison,
and no evidence that the model was unable to generate a richer renderer.

The download remains untouched. Original extracted source and screenshot are
retained locally in outputs, not promoted into an accepted reference template.
The repository retains two small original GLSL files as regression fixtures.

## Generator changes from this case

- Prompt guidance maps each major observed cue to an appearance mechanism and
  explicitly records unmatched cues. Tint-only clouds must not masquerade as
  changed cloud silhouettes; retain vanilla shapes when actually requested.
- Teach lightmap exposure/colour distinction, common-space shadow offsets,
  camera-independent wave phase and time/weather-aware reflection fallback.
- Source-linked report review warns about two observed lexical patterns:
  sampled lightmap RG split into levels, and view-space solar direction dotted
  against fixed camera-up. Approximation entries are reviewed too.
- Warnings preserve source and downloads, appear in existing report/log surfaces,
  and make no automatic paid repair calls. They are bounded hints, not data-flow
  analysis, a complete shader audit or visual scoring. Function aliases, guards,
  macros, indirect samplers, unused code and cross-file aliases need manual review.
  Absence of warnings does not mean an output matches the images.

## Next test

Use the same one-sentence request and two images, model and reasoning settings.
Keep time/weather/camera/resource packs fixed for shader comparisons. Check
cloud silhouette and horizon; then place a recognizable tree/building beside a
small lake, observe its reflection and pan/translate camera. Check cloud colour
while pitching the camera at fixed time and block/torch light in day/night.
Record approximation/omission claims alongside visible results. No fresh provider
request or production deployment was performed for this change. Automated image
retrieval, full semantic/data-flow review and render/compare/revise are not added.

## Primary interface references

Checked 2026-10-25:

- [Lightmap coordinates and exposures](https://shaders.properties/current/guides/your-first-shaderpack/2_gbuffers/)
- [View/player/world coordinate spaces](https://shaders.properties/current/how-to/coordinate_spaces/)
- [Matrix transforms](https://shaders.properties/current/reference/uniforms/matrices/)
- [View-space sunPosition](https://shaders.properties/current/reference/uniforms/overview/)
