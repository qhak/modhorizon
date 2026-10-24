#version 120
/* DRAWBUFFERS:4 */
#include "/lib/common.glsl"
uniform sampler2D colortex0;
uniform sampler2D depthtex0;
varying vec2 vUV;
void main() {
    vec3 scene = texture2D(colortex0, vUV).rgb;
    if (texture2D(depthtex0, vUV).r >= 1.0) scene = skyRadiance(viewRayWorld(vUV));
    gl_FragData[0] = vec4(scene, 1.0);
}
