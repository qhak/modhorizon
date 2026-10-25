#ifndef MH_OVERLAY_FRAGMENT_GLSL
#define MH_OVERLAY_FRAGMENT_GLSL
#include "/lib/lightmap.glsl"
uniform sampler2D texture;
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
void mhOverlayFragment() {
    vec4 texel = texture2D(texture, vUV) * vColour;
    if (texel.a < 0.003) discard;
    vec3 lit = texel.rgb * texture2D(lightmap, vLM).rgb;
    gl_FragData[0] = vec4(lit, texel.a);
}
#endif
