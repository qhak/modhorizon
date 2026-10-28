#version 120
/* DRAWBUFFERS:06 */
const bool colortex6Clear = true;
const vec4 colortex6ClearColor = vec4(0.0, 0.0, 0.0, 0.0);

#include "/lib/terrain_varyings.glsl"
#include "/lib/terrain_lighting.glsl"
#include "/lib/ore_emission.glsl"
uniform sampler2D texture;
uniform float alphaTestRef;
void main() {
    vec4 albedo = texture2D(texture, vUV) * vColour;
    if (albedo.a < alphaTestRef) discard;
    vec3 normalPlayer = normalize(vNormalPlayer);
    vec3 lit = mhLightSurface(albedo.rgb, normalPlayer, vPlayer, vLM);
    float emission = mhOreEmission(vUV, vMaterial);
    vec3 mineralEmission = albedo.rgb * emission * ORE_GLOW_STRENGTH;
    // Only mineral pixels get a lighting floor; host stone remains normally lit.
    float underwater = isEyeInWater == 1 ? exp(-length(vViewPos) * 0.025) : 1.0;
    lit = max(lit, mineralEmission * underwater);
    vec3 worldRay = normalize(mat3(gbufferModelViewInverse) * normalize(vViewPos));
    float fog = mhDistanceHaze(length(vViewPos));
    lit = mix(lit, skyColorWorld(worldRay), fog);
    gl_FragData[1] = vec4(mineralEmission * mhOreVisibility(fog, length(vViewPos)), 1.0);
    gl_FragData[0] = vec4(lit, albedo.a);
}
