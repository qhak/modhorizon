#version 120
/* DRAWBUFFERS:0 */
#include "/lib/sky_common.glsl"
uniform sampler2D texture;
varying vec2 vUV;
varying vec4 vColour;
void main() {
    vec4 texel = texture2D(texture, vUV) * vColour;
    if (texel.a < 0.01) discard;
    float warm = sunsetAmount();
    vec3 tint = mix(vec3(0.72, 0.79, 0.91), vec3(1.0, 0.82, 0.65), warm);
    float alpha = texel.a * 0.24;
    gl_FragData[0] = vec4(texel.rgb * tint, alpha);
}
