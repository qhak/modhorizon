#version 120
/* DRAWBUFFERS:0 */
uniform sampler2D texture;
varying vec2 vUV;
varying vec4 vColour;
void main() {
    vec4 texel = texture2D(texture, vUV) * vColour;
    if (texel.a <= 0.001 && dot(texel.rgb, texel.rgb) <= 0.000001) discard;
    gl_FragData[0] = texel;
}
