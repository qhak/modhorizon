# Aurora Horizon: original reference-inspired renderer

Status: candidate 03, 23 October 2026. Experimental foundation available through
bounded AI look adaptation from v0.9.0. This is not general runtime promotion or
reference-fidelity acceptance. The source is in `shader-foundations/aurora-horizon`.
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

Full visual acceptance still requires the owner/runtime record to demonstrate:

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

Attachments 0, 1 and 4 use RGBA16F. Format declarations are inside a block comment,
as Iris reads this metadata from source and the symbolic name is not built into
GLSL. Attachment 1 has an explicit GLSL transparent
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
| SURFACE_RELIEF | 0, .035, .065, .09 | Bounded terrain colour-height normal approximation |
| MATERIAL_HIGHLIGHTS | 0, .5, 1.0, 1.5 | Added terrain material highlights |

From v0.9.0 new Iris 1.21.11 requests use a structured reference interpretation,
eight numeric enum controls and a list of unmet requests. The server assembles
the pinned 30-file candidate03 renderer, changing only the eight macro values.
All four provider adapters receive capability/evidence context and actual images;
the complete renderer is not repeatedly generated or sent as input. One model
pass is used, with no automatic retry. This is context and code reuse, not
model-weight training or a guarantee that an image can be reproduced.

Follow-ups use this path only when every file matches a canonical output of the
versioned assembler. Unknown/modified files or markers retain the full-source
legacy edit path. Other versions and OptiFine retain their existing generator.
Invalid look responses fail clearly without overwriting the current project.
Arbitrary palettes, new architecture/effects and true PBR maps are outside these
controls; unmet requests are displayed in full in the source-derived feature
report and README. Models are told to retain unchanged current settings.

The snapshot is `src/lib/shader-foundation-data.json`; regenerate it using
`npm run sync:shader-foundation` after deliberate source changes. Tests require
exact parity with authored source. A new source revision requires a new
foundation identifier/recognition policy, native checks and in-game testing.
The Worker does not read source files from disk or run a native GPU compiler.
Quotes use the same compact input/schema/images as requests. Missing-usage
fallback counts the returned look JSON, not server-assembled source as AI output.

Evidence remains limited: the owner accepted one candidate02 water view; the
candidate03 material work is experimental. Default, minimum, maximum and zero
bloom/relief/highlight assembled variants compiled offline (88 stages/44 links,
zero failures on RTX 3070, NVIDIA 610.88). This is not exhaustive enumeration,
Iris integration testing, live output compilation or reference-fidelity proof.

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
without injected symbolic-format definitions or compatibility shims. These tests establish GLSL
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
  programs without failures only after the old checker injected an RGBA16F define.
  The owner then hit undefined RGBA16F errors in Iris. That shim masked a real
  integration error; the candidate-01 compile result was too permissive.
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

### Candidate 02 correction

The format declarations now use the documented block-comment form, and the native
checker no longer inserts any format definitions. The strict checker compiles all
22 stages and links 11 programs, and the synthetic lighting probe still passes.
Two native regression tests ensure that an un-commented undefined format name
fails while the documented metadata form passes. Run them with
`python tests/test_shader_driver.py` on Windows. Original candidate 01 is preserved;
candidate 02 needs a new Iris test before any visual-quality claim.

### Candidate 03 terrain iteration

The owner confirmed candidate 02 renders and praised its water, supplying a
shoreline screenshot. That establishes acceptance of the pictured water look,
not full scene/material preservation or reference fidelity. Candidate 03 keeps
the water programs, scene-copy, background, composite and final source unchanged.
The existing shared lightSurface function is unchanged, and the five deterministic
lighting outputs remain identical. Reflected scenery can change as terrain gains
new shading; this is not a claim of identical final pixels.

Terrain IDs 1003–1007 select rough stone, wood, metal, soil and polished stone.
The added GGX-style direct highlights use bounded category roughness/metal response,
sky exposure and the original shadow visibility. Diffuse shading is adjusted for
the perturbed normal without adding the original direct contribution twice.
Shadow position/bias keeps the geometric normal. Highlights use the eye translation
from gbufferModelViewInverse rather than assuming player-relative zero is the eye.
Antipodal half-vectors are guarded to avoid NaNs.

Near-camera surface gradients infer a small normal perturbation from texture
brightness. Position/height derivatives are evaluated before cutout discard, their
gradient is bounded, and the effect fades from 16–40 blocks. No neighbouring atlas
sprite is sampled. This is colour-height inference, not true PBR normal/height maps,
physical displacement or measured material data. Painted texture variation can
produce false bumps; compare moving close views for shimmer. Material categories
are manually curated and incomplete. The metal response is approximate and not a
claim of strict energy conservation. Foliage gets no inferred relief.

Native driver compilation/linking, original lighting behaviour, finite material
parameters, metal/stone highlight separation and shadow gating are tested. The
new in-game block appearance and performance still require owner comparison.

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
