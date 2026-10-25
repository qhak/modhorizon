#version 120
/* DRAWBUFFERS:0 */
#include "/lib/common.glsl"
varying vec2 vUV;
void main() { gl_FragData[0] = vec4(skyRadiance(viewRayWorld(vUV)), 1.0); }
