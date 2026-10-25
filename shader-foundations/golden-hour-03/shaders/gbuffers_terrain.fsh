#version 120
/* DRAWBUFFERS:0 */
#include "/lib/terrain_varyings.glsl"
#include "/lib/terrain_lighting.glsl"
uniform sampler2D texture;
uniform float alphaTestRef;
void main() {
    vec4 albedo = texture2D(texture, vUV) * vColour;
    if (albedo.a < alphaTestRef) discard;
    vec3 normalPlayer = normalize(vNormalPlayer);
    vec3 lit = mhLightSurface(albedo.rgb, normalPlayer, vPlayer, vLM);
    vec3 worldRay = normalize(mat3(gbufferModelViewInverse) * normalize(vViewPos));
    float fog = mhDistanceHaze(length(vViewPos));
    lit = mix(lit, skyColorWorld(worldRay), fog);
    gl_FragData[0] = vec4(lit, albedo.a);
}
