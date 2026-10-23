#version 120
/* DRAWBUFFERS:4 */
uniform sampler2D colortex0;
varying vec2 vUV;
void main() {
    gl_FragData[0] = vec4(texture2D(colortex0, vUV).rgb, 1.0);
}
