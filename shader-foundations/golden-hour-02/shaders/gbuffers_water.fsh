#version 120
/* DRAWBUFFERS:1 */
const bool colortex1Clear = true;
const vec4 colortex1ClearColor = vec4(0.0, 0.0, 0.0, 0.0);
/*
const int colortex1Format = RGBA16F;
*/
#include "/lib/terrain_varyings.glsl"
#include "/lib/sky_common.glsl"
#include "/lib/lightmap.glsl"
uniform sampler2D texture;
uniform sampler2D colortex4;
uniform sampler2D depthtex1;
uniform mat4 gbufferProjection;
uniform mat4 gbufferProjectionInverse;
uniform float viewWidth;
uniform float viewHeight;
#define MH_WATER_ENTITY_ID 10008.0
vec3 mhViewPositionFromDepth(vec2 uv, float depth) {
    vec4 clip = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    vec4 view = gbufferProjectionInverse * clip;
    return view.xyz / view.w;
}
vec3 mhTraceReflection(vec3 origin, vec3 ray, out float confidence) {
    confidence = 0.0;
    float previousT = 0.0;
    float previousDifference = 0.0;
    bool previousValid = false;
    for (int i = 0; i < 36; ++i) {
        float f = (float(i) + 1.0) / 36.0;
        float travel = 0.18 + f * f * 112.0;
        vec3 point = origin + ray * travel;
        vec4 clip = gbufferProjection * vec4(point, 1.0);
        if (clip.w <= 0.0) break;
        vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
        if (any(lessThan(uv, vec2(0.004))) || any(greaterThan(uv, vec2(0.996)))) break;
        float depth = texture2D(depthtex1, uv).r;
        if (depth >= 0.999999) {
            previousValid = false;
            continue;
        }
        vec3 scenePoint = mhViewPositionFromDepth(uv, depth);
        float difference = point.z - scenePoint.z;
        if (previousValid && travel > 0.55 && previousDifference > 0.0 && difference <= 0.0) {
            float lowT = previousT;
            float highT = travel;
            for (int j = 0; j < 5; ++j) {
                float midT = (lowT + highT) * 0.5;
                vec3 midPoint = origin + ray * midT;
                vec4 midClip = gbufferProjection * vec4(midPoint, 1.0);
                if (midClip.w <= 0.0) break;
                vec2 midUV = midClip.xy / midClip.w * 0.5 + 0.5;
                if (any(lessThan(midUV, vec2(0.002))) || any(greaterThan(midUV, vec2(0.998)))) {
                    lowT = midT;
                    continue;
                }
                float midDepth = texture2D(depthtex1, midUV).r;
                if (midDepth >= 0.999999) {
                    lowT = midT;
                } else {
                    vec3 midScene = mhViewPositionFromDepth(midUV, midDepth);
                    float midDifference = midPoint.z - midScene.z;
                    if (midDifference > 0.0) lowT = midT; else highT = midT;
                }
            }
            vec3 hitPoint = origin + ray * highT;
            vec4 hitClip = gbufferProjection * vec4(hitPoint, 1.0);
            vec2 hitUV = hitClip.xy / hitClip.w * 0.5 + 0.5;
            float hitDepth = texture2D(depthtex1, hitUV).r;
            if (hitDepth < 0.999999) {
                vec3 finalScene = mhViewPositionFromDepth(hitUV, hitDepth);
                float error = abs(finalScene.z - hitPoint.z);
                if (error < 0.72 + highT * 0.018) {
                    float edge = min(min(hitUV.x, hitUV.y), min(1.0 - hitUV.x, 1.0 - hitUV.y));
                    confidence = smoothstep(0.004, 0.075, edge) * (1.0 - smoothstep(78.0, 112.0, highT));
                    return texture2D(colortex4, hitUV).rgb;
                }
            }
        }
        previousT = travel;
        previousDifference = difference;
        previousValid = true;
    }
    return vec3(0.0);
}
float mhWaterHeight(vec2 p) {
    float t = frameTimeCounter;
    vec2 drift = vec2(t * 0.42, t * 0.21);
    float broad = mhFbm(p * 0.045 + drift * 0.05);
    float ripple = mhFbm(p * 0.16 + vec2(-drift.y, drift.x) * 0.12);
    float fine = mhFbm(p * 0.39 + drift * 0.19);
    return (broad - 0.5) * 0.10 + (ripple - 0.5) * 0.035 + (fine - 0.5) * 0.012;
}
void main() {
    vec4 albedo = texture2D(texture, vUV) * vColour;
    if (albedo.a < 0.004) discard;
    vec3 lightmapColor = texture2D(lightmap, vLM).rgb;
    if (abs(vMaterial - MH_WATER_ENTITY_ID) > 0.5) {
        vec3 ordinaryColor = albedo.rgb * lightmapColor;
        gl_FragData[0] = vec4(ordinaryColor, albedo.a);
        return;
    }
    vec2 screenUV = gl_FragCoord.xy / vec2(viewWidth, viewHeight);
    float opaqueDepth = texture2D(depthtex1, screenUV).r;
    float thickness = 14.0;
    if (opaqueDepth < 0.999999) {
        vec3 bedPosition = mhViewPositionFromDepth(screenUV, opaqueDepth);
        thickness = max(0.0, -bedPosition.z + vViewPos.z);
    }
    float depthFactor = 1.0 - exp(-thickness * 0.16);
    vec3 worldPosition = cameraPosition + vPlayer;
    vec2 p = worldPosition.xz;
    float e = 0.18;
    float dhdx = (mhWaterHeight(p + vec2(e, 0.0)) - mhWaterHeight(p - vec2(e, 0.0))) / (2.0 * e);
    float dhdz = (mhWaterHeight(p + vec2(0.0, e)) - mhWaterHeight(p - vec2(0.0, e))) / (2.0 * e);
    float faceSign = vNormalPlayer.y < 0.0 ? -1.0 : 1.0;
    vec3 waveNormal = normalize(vec3(-dhdx, faceSign, -dhdz));
    vec3 baseNormal = normalize(vNormalPlayer);
    vec3 normalPlayer = normalize(mix(baseNormal, waveNormal, clamp(abs(baseNormal.y), 0.0, 1.0)));
    vec3 normalView = normalize(mat3(gbufferModelView) * normalPlayer);
    vec3 viewDir = normalize(-vViewPos);
    if (dot(normalView, viewDir) < 0.0) normalView = -normalView;
    float nDotV = max(dot(normalView, viewDir), 0.0);
    vec3 incident = normalize(vViewPos);
    vec3 reflectionRay = normalize(reflect(incident, normalView));
    vec3 worldReflection = normalize(mat3(gbufferModelViewInverse) * reflectionRay);
    vec3 skyFallback = skyColorWorld(worldReflection);
    float hitConfidence = 0.0;
    vec3 traced = mhTraceReflection(vViewPos + normalView * 0.075, reflectionRay, hitConfidence);
    vec3 reflection = mix(skyFallback, traced, hitConfidence);
    vec3 shallowTint = vec3(0.12, 0.23, 0.17);
    vec3 deepTint = vec3(0.022, 0.105, 0.135);
    vec3 transmitted = mix(shallowTint, deepTint, depthFactor);
    transmitted = mix(transmitted, albedo.rgb, 0.20) * (0.72 + 0.28 * lightmapColor);
    float reflectance = clamp(0.14 + 0.72 * pow(1.0 - nDotV, 4.0), 0.14, 0.84);
    vec3 surfaceColor = mix(transmitted, reflection, reflectance);
    vec3 sunView = normalize(mat3(gbufferModelView) * worldSunDirection());
    vec3 halfVector = normalize(sunView + viewDir);
    float sunSpec = pow(max(dot(normalView, halfVector), 0.0), 88.0) * dayAmount() * (1.0 - rainStrength * 0.8);
    surfaceColor += vec3(1.0, 0.75, 0.48) * sunSpec * 0.65;
    float alpha = mix(0.34, 0.60, depthFactor) * clamp(albedo.a, 0.55, 1.0);
    // Fade water to the viewing sky, not the reflected sky. At far distance
    // alpha also converges to one so the unfogged bed cannot leak through.
    float atmosphere = isEyeInWater == 1 ? 0.0 : mhDistanceHaze(length(vViewPos));
    vec3 viewingSky = skyColorWorld(normalize(mat3(gbufferModelViewInverse) * incident));
    surfaceColor = mix(surfaceColor, viewingSky, atmosphere);
    alpha = mix(alpha, 1.0, atmosphere);
    gl_FragData[0] = vec4(surfaceColor, alpha);
}
