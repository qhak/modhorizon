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
    evidence: "Excerpts from original AuroraHorizon candidate03 for Iris 1.21.11. The base compiled offline on one NVIDIA driver. On 2026-10-24 the owner named candidate03 the best water baseline so far; blocks still need realistic texture work. Candidate03 terrain, BlocksLab01 materials and CleanSkyLab01 sky are experimental, not accepted visual references. None of this verifies a newly generated shader.",
    applicability: applicable ? "Exact example target matches; still check all dependencies and interfaces." : "Example runtime differs. Source excerpts withheld; do not assume Iris-only passes or this version's interfaces for the selected target.",
    lessons: [
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
