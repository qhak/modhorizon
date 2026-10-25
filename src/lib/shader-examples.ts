import source from "./shader-foundation-data.json";
import { selectShaderModules } from "./shader-context";
import type { GenerateRequest } from "./types";

export const MAX_SHADER_EXAMPLE_CHARS = 11_000;
const file = (path: string) => source.find(item => item.path === `shaders/${path}`)!.content;
const before = (path: string, marker: string) => file(path).split(marker)[0];

/** Focused authored excerpts, never an automatically materialized output template. */
export function shaderExampleContext(request: GenerateRequest) {
  const applicable = request.target === "iris" && request.version === "1.21.11";
  const index = {
    role: "Optional engineering examples, not required code, palette, architecture or look controls. Generate complete source for the user's requested shader, including effects absent from these examples. No server assembly occurs.",
    evidence: "Excerpts from original AuroraHorizon candidate03 for Iris 1.21.11. The base compiled offline on one NVIDIA driver. On 2026-10-24 the owner named candidate03 the best water baseline and gave positive feedback on the separate BlocksLab01 sand screenshot. That is component feedback, not validation of all blocks. Candidate03 terrain, new BlocksLab02 materials and CleanSkyLab01 sky remain experimental. None of this verifies a newly generated shader.",
    applicability: applicable ? "Exact example target matches; still check all dependencies and interfaces." : "Example runtime differs. Source excerpts withheld; do not assume Iris-only passes or this version's interfaces for the selected target.",
    lessons: [
      "GoldenHour horizon02 screenshot: horizon improved but deep bed/kelp dominated water. Local water03 replaces fixed 0.34-0.60 opacity with depth/angle-dependent transmission, scatter and coverage, outputting straight RGB so existing SRC_ALPHA composition preserves reflection instead of attenuating it twice. Sky, trace and wave source are unchanged. Native layer tests check the radiance budget, shallows/depth and horizon/glass; new appearance still requires Minecraft feedback. This is an authored example, not proof of fresh AI capability.",
      "GoldenHourReflectiveHorizon game screenshot showed a dark water/horizon band despite a successful 38-stage/19-link compile. Retained source has a lower-sky branch jump at h=-0.04 and no water distance haze. Local horizon02 removes the measured jump and makes far water RGB/alpha converge to viewing sky using shared render-distance fade; five synthetic native regressions pass. This is a local revision, not an AI success or Minecraft acceptance. Reflection trace/wave code is retained; clouds remain 2D.",
      "AmberglassReflections short-prompt/two-image audit: source has real 40-step depth-tested SSR, but sky only adds a tint and clouds keep vanilla silhouettes. It compiles (16 stages/8 links); this does not prove reference fidelity. The cloud code uses view-space sun dot fixed camera-up; terrain/water split sampled vanilla lightmap RGB into sky/block exposures. Correct those semantics, share time/weather-aware sky fallback, and record unmatched shape/material cues. Do not replace actual source review with line counts or longer generation time.",
      "Candidate05 game feedback showed sky colour/clouds but a tiny sun, streaks and pale horizon. Candidate06 experiments with bounded angular cloud coordinates, a larger stylized solar disc and lower distance haze. Preserve material/lighting controls; a synthetic preview is not game acceptance. Avoid horizon 1/y cloud-coordinate singularities; simple 2D clouds cannot claim volumetric realism.",
      "Owner retains BlocksLab04 grass/leaves as the current material baseline. A later synthetic test reproduced its blank sky: composite/deferred trusted white scene input. Candidate05 explicitly fills depth-empty background before translucency and in the scene snapshot. This is measured native source behavior, not Iris visual acceptance or proof of the new palette.",
      "Use compatibility built-ins without redeclaring gl_ names. RGBA16F format metadata belongs inside the runtime's parsed block comment, not an undefined native GLSL expression.",
      "Explicit routing selects attachment slots: DRAWBUFFERS:4 maps gl_FragData[0] to colortex4. Clear a separate translucent layer to transparent and composite with a coherent alpha/blend contract.",
      "Keep one coordinate convention, linear scene light and one final display conversion. Preserve water/glass separation, cutout alpha and scene background; match every sampled buffer to a writer and lifetime.",
    ],
  };
  const examples: { technique: string; dependencies: string; excerpts: { path: string; content: string }[] }[] = [];
  if (applicable) {
    examples.push({
      technique: "Geometry coordinate contract", dependencies: "GLSL120 compatibility inputs, gbufferModelViewInverse; fragment varyings must match. mhVertex requires an executable vertex-stage main wrapper. This is an include, not a complete shader.",
      excerpts: [{ path: "lib/geometry_vertex.glsl", content: file("lib/geometry_vertex.glsl") }],
    });
    for (const { id } of selectShaderModules(request)) {
      if (id === "lighting" || id === "stylized") examples.push({
        technique: "Separate directional, ambient and block light with shadow visibility; adapt the light response for the requested style",
        dependencies: "Excerpt needs common-space worldDirection/daylight/directColour helpers, AMBIENT_STRENGTH/SUN_INTENSITY, shadowLightPosition/rainStrength, shadowtex0/shadow matrices and matching alpha-tested shadow.vsh/fsh. Positions are feet-relative player space with world-oriented axes; view vectors need the actual eye translation from gbufferModelViewInverse. Do not use without implementing the complete dependency graph.",
        excerpts: [{ path: "lib/lighting.glsl (through lightSurface)", content: before("lib/lighting.glsl", "// Terrain-only extension:") }],
      });
      if (id === "water") examples.push({
        technique: "Opaque scene snapshot and bounded screen-space reflection trace",
        dependencies: "deferred.vsh supplies texcoord. Copy explicit colour0 to4 before water; water routes output slot0 to layer1, transparent-cleared, then composite combines0/1. Trace excerpt needs gbufferProjection, depthtex1, colortex4 and inverse-projection viewPosition(). Ray/origin are view-space; callers must transform consistently, provide Fresnel/normals/material gating and off-screen fallback. This is not a standalone pack.",
        excerpts: [{ path: "deferred.fsh", content: file("deferred.fsh") }, { path: "gbuffers_water.fsh (declarations and traceScene)", content: before("gbuffers_water.fsh", "void main()") }],
      });
      if (id === "sky") examples.push({
        technique: "Consistent sky and reflection fallback helper; invent the requested palette rather than copying this sunset",
        dependencies: "common.glsl is a helper include with uniforms and example settings, not restricted controls. Iris begin/composite or sky-stage callers must reconstruct matching world-axis view rays. Alternative pipelines are allowed. Clouds here are2D, not volumetric; new cloud implementations require their own code.",
        excerpts: [{ path: "lib/common.glsl", content: file("lib/common.glsl") }],
      });
      if (id === "atmosphere") examples.push({
        technique: "Highlight-only bloom and one final colour transform",
        dependencies: "final.vsh supplies texcoord; colortex0 must hold linear HDR and stay out of input/output feedback. common.glsl supplies BLOOM_STRENGTH/EXPOSURE/viewWidth/viewHeight. Example values are editable, not an allowlist. Other bloom/tone-mapping pipelines are allowed.",
        excerpts: [{ path: "final.fsh", content: file("final.fsh") }],
      });
    }
  }
  // Include complete excerpt groups only. Never truncate source in the middle of a function.
  while (JSON.stringify({ ...index, examples }).length > MAX_SHADER_EXAMPLE_CHARS) examples.pop();
  return { ...index, examples };
}
