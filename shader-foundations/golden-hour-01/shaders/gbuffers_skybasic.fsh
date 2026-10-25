#version 120
/* DRAWBUFFERS:0 */
#include "/lib/sky_common.glsl"
varying vec3 vWorldDir;
varying vec4 vColour;
void main() {
    vec3 color = skyColorWorld(vWorldDir);
    float starGate = step(0.72, max(max(vColour.r, vColour.g), vColour.b));
    color += max(vColour.rgb - vec3(0.30), vec3(0.0)) * starGate * 0.72;
    gl_FragData[0] = vec4(color, 1.0);
}
