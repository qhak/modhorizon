# Aurora Horizon: original reference-inspired renderer

Status: candidate 01, 23 October 2026. Experimental, not yet promoted into the
ModHorizon AI generation path. The source is in `shader-foundations/aurora-horizon`.
Target: Minecraft Java 1.21.11 with Iris 1.10.8. OptiFine is not supported by this
candidate because its early background uses Iris's `begin` pass.

## Specification and acceptance

The owner wants the whole scene to gain plausible light and depth, especially
ordinary blocks and water. The two references provide visual goals: warm low
sunlight, softer shaded surfaces, cast tree/building shadows, peach haze, soft
clouds and recognisable reflected landscape. Merely changing global colour,
successfully creating a ZIP or restoring a broken pipeline does not meet this.

The source is original; neither a reference shader nor its assets were copied.
This is a compact first foundation rather than a claim of reference-pack parity.

Promotion requires the owner/runtime record to demonstrate:

1. Recognisable cast shadows and clearly different sun-facing/shaded block faces.
2. Visible nearby landscape shapes reflected at the shoreline; readable shallows.
3. Preserved leaf alpha, entities, held items, glass, particles and weather.
4. A coherent sky/fog transition at sunset, plus readable noon/night/torch scenes.
5. Acceptable underwater behaviour and documented overlapping-transparency limits.
6. Actual Iris compilation and measured frame rate at recorded settings.

Each changed candidate gets a separate ZIP. Keep originals, repairs and subsequent
AI outputs distinct. Do not call hand-authored repairs successful AI generations.

## Pass and buffer contract

| Stage | Reads | Writes | Contract |
|---|---|---|---|
| begin | view/projection, sun/time | colortex0 | Complete procedural linear sky before world geometry |
| shadow | geometry/atlas/material ID | shadow depth | Unwarped shadow projection, cutout alpha, excludes water/glass |
| opaque gbuffers | atlas, lightmap UV, shadow depth | colortex0 | Linear forward lighting; direct, ambient and block light separated |
| deferred | colortex0 | colortex4 | Stable opaque scene snapshot before translucent rendering |
| gbuffers_water | colortex4, depthtex1, atlas, shadow depth | colortex1 | Cleared transparent; explicit mapping; water IDs separate from glass |
| composite | 0, 1, depthtex0/1 | colortex0 | Layer composition, contact occlusion, distance haze, screen-space shafts |
| final | colortex0 HDR | display | Highlight bloom and a single exposure/filmic/gamma transform |

Attachments 0, 1 and 4 use RGBA16F. Attachment 1 has an explicit GLSL transparent
clear colour with all four components. Each fragment stage declares its outputs;
`gl_FragData[0]` means the first selected attachment, not always attachment zero.
Only composite-style passes rely on Iris ping-pong when reading/writing logical
attachment zero. No gbuffers code samples restricted colortex0–3 scene bindings.

Sky is painted before geometry. Deferred/composite do not replace sky-depth pixels
afterwards, avoiding erasure of non-depth-writing particles/weather. Clear ordering
was checked against the official Iris 1.21.11 implementation: target clear precedes
`beginRenderer.renderAll()`, and no main target clear intervenes before geometry.

## Light and coordinate contract

Geometry goes local → view via the compatibility model-view, then view →
player-relative via `gbufferModelViewInverse`. Shadow lookup applies
`shadowProjection * shadowModelView` to that player-relative position. Camera
world position is added only for world-anchored water waves, never shadow lookup.
Generation and lookup use the same unwarped shadow projection.

Normals and light directions are rotated into the same player-oriented space.
`shadowLightPosition` follows the active sun/moon shadow camera; `sunPosition`
controls sky appearance and daylight. Sun elevation changes lighting naturally.
Normal offset, slope bias, 3x3 PCF and distance fade balance acne/softness/coverage.
Only direct light is shadowed. Sky/block-light UV channels and vertex AO remain
separate so a cast shadow does not remove torch light or all ambient illumination.

Texture colour is converted to linear before lighting. Geometry, sky, water and
fog use that convention; only final applies tone mapping and display gamma.
The foundation retains vanilla textures; PBR normal/roughness relief is omitted.

## Bounded look controls for eventual AI adaptation

| Macro | Allowed candidate values | Visual role |
|---|---|---|
| SUN_INTENSITY | 2.0, 2.6, 3.2, 3.8 | Direct light strength |
| AMBIENT_STRENGTH | .20, .26, .32, .42 | Fill and shadow readability |
| FOG_DENSITY | .0015, .0025, .0035, .0050 | Atmospheric depth |
| WATER_WAVES | .015, .030, .045, .060 | Reflective normal ripples |
| BLOOM_STRENGTH | 0, .05, .10, .15 | Highlight glow |
| EXPOSURE | .85, 1.0, 1.05, 1.15 | Final brightness |

After runtime promotion, provide the working source, this contract, observed
acceptance evidence and known failure cases as context. The AI should explain
reference observations, choose bounded look values, then make scoped source edits
only when a requested effect requires them. Recompile and retest architecture
changes. Do not replace this renderer with a tiny colour-filter scaffold, invent
new uniforms/buffer properties, or silently omit a defining reference feature.

This is retrieval/context and code reuse, not model-weight training. The current
release does not inject this unverified candidate into provider requests.

## Build and verification

From the repository root:

```powershell
npm run package:shader-foundation
python scripts/shaders/check_glsl.py shader-foundations/aurora-horizon
python scripts/shaders/probe_lighting.py shader-foundations/aurora-horizon
```

The packager uses the application's real 30-file/150-KB validation and ZIP writer.
It refuses to replace a different existing output candidate. The Python tools use
only the standard library and an invisible WGL compatibility context; they do not
control Minecraft or install anything. Compile/link tests use the actual GPU driver,
with explicitly reported symbolic-format preamble shims. These tests establish GLSL
syntax/types/linking, not Iris integration or visual fidelity. The synthetic lighting
probe is a controlled shader-function test, not an in-game screenshot.

Current limitations: screen-space/offscreen reflection limits; fixed shadow filter;
single overwritten translucent layer; 2D clouds and screen-space shafts; no GI,
volumetric clouds, caustics, foam or PBR materials. Basic debug/line shaders use Iris
fallback. Nether/End, entity overlays, rain and full transparency need game tests.

### Candidate 01 evidence

- 100 existing/foundation tests and TypeScript pass.
- 30 files package through the live validator and ZIP writer, with no source
  normalisation and no report warnings; ZIP size 16,544 bytes.
- Native RTX 3070 / NVIDIA 610.88 driver compiles 22 GLSL stages and links 11
  programs without failures. The reported RGBA16F symbolic-format shim stands
  in for Iris's parser define; no invalid GLSL is stripped from the source.
- The offscreen lighting probe executes the actual shared lighting source.
  Sun-facing RGB is approximately (.251,.245,.223), reverse-facing
  (.00594,.00750,.01002), occluded (.01098,.01410,.01914). In a dark case,
  blocklight raises RGB from (.00151,.00169,.00199) to (.234,.113,.0369).
  These are deterministic synthetic inputs, not pixel measurements from Minecraft.
- Source review caught forced .95 alpha and late sky replacement. Candidate 01
  preserves non-water alpha and paints sky before geometry instead.
- Installed copies in standard and isolated shaderpacks plus Downloads match the
  packaged SHA256: 1CA3D84AADBED01C5C271C30098B312212408F9EC5FE4A43BF3D6DD32B6A1B0A.

No actual Iris runtime or reference-quality pass is claimed by those checks.

## Primary implementation references

Checked 23 October 2026:

- [Colour buffer access, clears and flipping](https://shaders.properties/current/reference/buffers/colortex/)
- [Depth-buffer availability](https://shaders.properties/current/reference/buffers/depthtex/)
- [Matrix spaces](https://shaders.properties/current/reference/uniforms/matrices/)
- [Shadow pass](https://shaders.properties/current/reference/programs/shadow/)
- [Begin pass](https://shaders.properties/current/reference/programs/begin/)
- [Iris 1.21.11 clear/begin order](https://github.com/IrisShaders/Iris/blob/1.21.11/common/src/main/java/net/irisshaders/iris/pipeline/IrisRenderingPipeline.java#L990)
- [AO and legacy-lighting controls](https://shaders.properties/current/reference/shadersproperties/features/)
- [Blending and ping-pong](https://shaders.properties/current/reference/shadersproperties/rendering/)
- [Buffer clear constants](https://shaders.properties/current/reference/constants/buffer_clear_color/)

The references establish engine interfaces. They do not establish this candidate's
correctness; the acceptance record and versioned source must supply that evidence.
