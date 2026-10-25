#version 120
/* DRAWBUFFERS:0 */
#include "/lib/sky_common.glsl"
uniform sampler2D colortex0;
uniform sampler2D colortex1;
uniform sampler2D depthtex1;
uniform mat4 gbufferProjectionInverse;
varying vec2 vUV;
vec3 mhCompositeSkyRay(vec2 uv) {
    vec4 view = gbufferProjectionInverse * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
    return normalize(mat3(gbufferModelViewInverse) * normalize(view.xyz / view.w));
}
void main() {
    vec3 scene = texture2D(colortex0, vUV).rgb;
    if (texture2D(depthtex1, vUV).r >= 0.999999) scene = skyColorWorld(mhCompositeSkyRay(vUV));
    vec4 overlay = texture2D(colortex1, vUV);
    vec3 color = overlay.rgb + scene * (1.0 - clamp(overlay.a, 0.0, 1.0));
    gl_FragData[0] = vec4(color, 1.0);
}
