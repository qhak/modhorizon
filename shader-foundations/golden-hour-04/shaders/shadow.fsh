#version 120
/* DRAWBUFFERS:0 */
uniform sampler2D texture;
uniform float alphaTestRef;
varying vec2 vUV;
varying vec4 vColour;
void main() {
    float alpha = texture2D(texture, vUV).a * vColour.a;
    if (alpha < alphaTestRef) discard;
    gl_FragData[0] = vec4(1.0);
}
