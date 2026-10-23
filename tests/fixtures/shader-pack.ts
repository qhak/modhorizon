/** Structurally complete fixture, not a GPU-verified rendering reference. */
export function shaderPackFixture() {
  const vertex = `#version 330 compatibility
out vec2 texcoord;
out vec2 lmcoord;
out vec4 tint;
void main() {
  gl_Position = ftransform();
  texcoord = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
  lmcoord = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
  tint = gl_Color;
}`;
  const terrain = `#version 330 compatibility
uniform sampler2D gtexture;
uniform sampler2D lightmap;
uniform float alphaTestRef;
in vec2 texcoord;
in vec2 lmcoord;
in vec4 tint;
/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;
void main() {
  color = texture(gtexture, texcoord) * tint;
  if (color.a < alphaTestRef) discard;
  color.rgb *= texture(lightmap, lmcoord).rgb;
}`;
  const clouds = `#version 330 compatibility
uniform sampler2D gtexture;
in vec2 texcoord;
in vec4 tint;
/* RENDERTARGETS: 0 */
layout(location = 0) out vec4 color;
void main() { color = texture(gtexture, texcoord) * tint; }`;
  return { name: "WarmSky", message: "/reference shaders/gbuffers_terrain.fsh", files: [
    { path: "shader-plan.json", content: JSON.stringify({ goal: "Preserve visible terrain and clouds", referenceSummary: "No image supplied", pipeline: ["Render terrain and clouds into the scene colour buffer"], features: [{ name: "World rendering", kind: "baseline", priority: 1, status: "implemented", technique: "Textured lightmapped terrain and separate textured clouds", files: ["shaders/gbuffers_terrain.fsh", "shaders/gbuffers_clouds.fsh"], limitations: "GPU compilation and appearance not tested" }] }) },
    { path: "shaders/gbuffers_terrain.vsh", content: vertex },
    { path: "shaders/gbuffers_terrain.fsh", content: terrain },
    { path: "shaders/gbuffers_clouds.vsh", content: vertex },
    { path: "shaders/gbuffers_clouds.fsh", content: clouds },
    { path: "shaders/shaders.properties", content: "# Keep vanilla clouds enabled\nclouds=fancy\n" },
  ] };
}
