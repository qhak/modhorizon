#version 120
/* DRAWBUFFERS:0 */
#include "/lib/common.glsl"
uniform sampler2D colortex0;
uniform sampler2D colortex1;
uniform sampler2D depthtex0;
uniform sampler2D depthtex1;
varying vec2 vUV;
// Iris reads these directives from a block comment; RGBA16F is not a GLSL name.
/*
const int colortex0Format = RGBA16F;
const int colortex1Format = RGBA16F;
const int colortex4Format = RGBA16F;
*/
const bool colortex1Clear = true;
const vec4 colortex1ClearColor = vec4(0.0, 0.0, 0.0, 0.0);
const float ambientOcclusionLevel = 1.0;
float contactOcclusion(vec3 p, vec3 n) {
    float occ = 0.0;
    vec2 radius = vec2(1.0 / viewWidth, 1.0 / viewHeight) * clamp(130.0 / max(-p.z, 1.0), 2.0, 14.0);
    for (int i = 0; i < 8; ++i) {
        float angle = float(i) * (MH_PI / 4.0);
        vec2 uv = clamp(vUV + vec2(cos(angle), sin(angle)) * radius, vec2(0.001), vec2(0.999));
        float depth = texture2D(depthtex1, uv).r;
        vec3 delta = viewPosition(uv, depth) - p;
        float distanceToSample = length(delta);
        float facing = max(dot(n, delta / max(distanceToSample, 0.001)) - 0.15, 0.0);
        occ += facing * (1.0 - smoothstep(0.05, 1.8, distanceToSample)) * (1.0 - step(0.99999, depth));
    }
    return clamp(1.0 - occ * 0.14, 0.65, 1.0);
}
void main() {
    float opaqueDepth = texture2D(depthtex1, vUV).r;
    float frontDepth = texture2D(depthtex0, vUV).r;
    vec3 p = viewPosition(vUV, opaqueDepth);
    vec3 normal = normalize(cross(dFdx(p), dFdy(p)));
    if (dot(normal, -p) < 0.0) normal = -normal;
    vec3 ray = viewRayWorld(vUV);
    vec3 sky = skyRadiance(ray);
    vec3 scene = texture2D(colortex0, vUV).rgb;
    if (opaqueDepth >= 1.0) scene = sky;
    if (opaqueDepth < 0.99999) scene *= contactOcclusion(p, normal);
    vec4 layer = texture2D(colortex1, vUV);
    scene = mix(scene, layer.rgb, clamp(layer.a, 0.0, 1.0));
    if (frontDepth < 0.99999) {
        vec3 front = viewPosition(vUV, frontDepth);
        float distanceToEye = length(front);
        float haze = 1.0 - exp(-distanceToEye * FOG_DENSITY * (1.0 + goldenHour() * 0.55 + rainStrength * 2.0));
        haze = max(haze, smoothstep(far * 0.62, far * 0.97, distanceToEye));
        scene = mix(scene, sky, clamp(haze, 0.0, 1.0));
        if (isEyeInWater == 1) {
            float underwaterFog = 1.0 - exp(-distanceToEye * 0.09);
            scene = mix(scene, vec3(0.015, 0.11, 0.14), underwaterFog);
        }
    }
    // Screen-space light shafts: occluded by scene depth, not volumetric scattering.
    vec4 sunClip = gbufferProjection * vec4(sunPosition, 1.0);
    if (sunClip.w > 0.0) {
        vec2 sunUV = sunClip.xy / sunClip.w * 0.5 + 0.5;
        vec2 stepUV = (sunUV - vUV) * 0.65 / 12.0;
        float shafts = 0.0;
        for (int i = 1; i <= 12; ++i) {
            vec2 uv = vUV + stepUV * float(i);
            if (all(greaterThan(uv, vec2(0.0))) && all(lessThan(uv, vec2(1.0))))
                shafts += step(0.99999, texture2D(depthtex1, uv).r) * (1.0 - float(i) / 14.0);
        }
        float nearSun = exp(-length(sunUV - vUV) * 3.0);
        scene += directColour() * shafts * 0.009 * nearSun * goldenHour() * (1.0 - rainStrength);
    }
    gl_FragData[0] = vec4(max(scene, vec3(0.0)), 1.0);
}
