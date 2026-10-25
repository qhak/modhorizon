#version 120
/* DRAWBUFFERS:0 */
#include "/lib/terrain_varyings.glsl"
#include "/lib/terrain_lighting.glsl"
uniform sampler2D texture;
uniform float alphaTestRef;
void main() {
    vec4 albedo = texture2D(texture, vUV) * vColour;
    if (albedo.a < alphaTestRef) discard;
    vec3 lit = mhLightSurface(albedo.rgb, normalize(vNormalPlayer), vPlayer, vLM);
    vec3 worldRay = normalize(mat3(gbufferModelViewInverse) * normalize(vViewPos));
    float fog = smoothstep(96.0, 240.0, length(vViewPos)) * (1.0 - rainStrength * 0.18);
    gl_FragData[0] = vec4(mix(lit, skyColorWorld(worldRay), fog), albedo.a);
}
