#version 120
/* DRAWBUFFERS:4 */
/*
const int colortex4Format = RGBA16F;
*/
#include "/lib/sky_common.glsl"
uniform sampler2D colortex0;
uniform sampler2D depthtex1;
uniform mat4 gbufferProjectionInverse;
varying vec2 vUV;
vec3 mhSkyRay(vec2 uv) {
    vec4 view = gbufferProjectionInverse * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    return normalize(mat3(gbufferModelViewInverse) * normalize(view.xyz / view.w));
}
void main() {
    vec4 scene = texture2D(colortex0, vUV);
    float depth = texture2D(depthtex1, vUV).r;
    if (depth >= 0.999999) scene = vec4(skyColorWorld(mhSkyRay(vUV)), 1.0);
    else scene.a = 1.0;
    gl_FragData[0] = scene;
}
