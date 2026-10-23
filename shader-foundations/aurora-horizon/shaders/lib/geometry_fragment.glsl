#include "/lib/lighting.glsl"
uniform sampler2D texture;
uniform float alphaTestRef;
#ifdef MH_ENTITY
uniform vec4 entityColor;
#endif
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
varying vec3 vPlayer;
varying vec3 vNormal;
void mhSurface() {
#ifdef MH_BASIC
    gl_FragData[0] = vec4(toLinear(vColour.rgb), vColour.a);
#else
    vec4 texel = texture2D(texture, vUV);
    float alpha = texel.a;
#ifndef MH_TERRAIN
    alpha *= vColour.a;
#endif
    if (alpha < alphaTestRef) discard;
    vec3 albedo = toLinear(texel.rgb * vColour.rgb);
    vec3 n = length(vNormal) > 0.01 ? normalize(vNormal) : normalize(-vPlayer);
    float ao = 1.0;
#ifdef MH_TERRAIN
    ao = clamp(vColour.a, 0.0, 1.0);
#endif
    float shadows = 1.0;
#ifdef MH_PARTICLE
    shadows = 0.0;
#endif
    vec3 lit = lightSurface(albedo, n, vPlayer, vLM, ao, shadows);
#ifdef MH_ENTITY
    lit = mix(lit, toLinear(entityColor.rgb), entityColor.a);
#endif
    gl_FragData[0] = vec4(lit, alpha);
#endif
}
