#ifndef MH_LIT_FRAGMENT_GLSL
#define MH_LIT_FRAGMENT_GLSL
#include "/lib/lightmap.glsl"
uniform sampler2D texture;
uniform float alphaTestRef;
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
void mhLitFragment() {
    vec4 texel = texture2D(texture, vUV) * vColour;
    if (texel.a < alphaTestRef) discard;
    vec3 light = texture2D(lightmap, vLM).rgb;
    gl_FragData[1] = vec4(0.0);
    gl_FragData[0] = vec4(texel.rgb * light, 1.0);
}
#endif
