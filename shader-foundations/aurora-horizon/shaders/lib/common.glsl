#ifndef MH_COMMON
#define MH_COMMON
// Original ModHorizon renderer. Look controls; buffer contracts are not look controls.
#define SUN_INTENSITY 3.2 // [2.0 2.6 3.2 3.8]
#define AMBIENT_STRENGTH 0.32 // [0.20 0.26 0.32 0.42]
#define FOG_DENSITY 0.0035 // [0.0015 0.0025 0.0035 0.0050]
#define WATER_WAVES 0.045 // [0.015 0.030 0.045 0.060]
#define BLOOM_STRENGTH 0.10 // [0.0 0.05 0.10 0.15]
#define EXPOSURE 1.05 // [0.85 1.0 1.05 1.15]
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferProjection;
uniform mat4 gbufferProjectionInverse;
uniform vec3 sunPosition;
uniform vec3 shadowLightPosition;
uniform vec3 cameraPosition;
uniform float frameTimeCounter;
uniform float rainStrength;
uniform float viewWidth;
uniform float viewHeight;
uniform float far;
uniform int isEyeInWater;
const float MH_PI = 3.14159265;
vec3 toLinear(vec3 c) { return pow(max(c, vec3(0.0)), vec3(2.2)); }
vec3 worldDirection(vec3 v) { return normalize(mat3(gbufferModelViewInverse) * v); }
vec3 sunWorld() { return worldDirection(sunPosition); }
float daylight() { return smoothstep(-0.12, 0.12, sunWorld().y); }
float goldenHour() { return (1.0 - smoothstep(0.08, 0.55, abs(sunWorld().y))) * daylight(); }
vec3 directColour() { return mix(vec3(1.0, 0.96, 0.85), vec3(1.0, 0.54, 0.24), goldenHour() * 0.82); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise2(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0)), f.x), f.y);
}
float cloudNoise(vec2 p) { return noise2(p) * 0.57 + noise2(p * 2.07 + 17.0) * 0.28 + noise2(p * 4.13) * 0.15; }
vec3 skyRadiance(vec3 direction) {
    vec3 rd = normalize(direction), sun = sunWorld();
    float day = daylight(), gold = goldenHour();
    float elevation = clamp(rd.y, 0.0, 1.0);
    float horizon = exp(-elevation * 5.0);
    float toward = pow(max(dot(rd, sun), 0.0), 8.0);
    vec3 top = mix(vec3(0.006, 0.013, 0.035), vec3(0.12, 0.29, 0.60), day);
    vec3 rim = mix(vec3(0.025, 0.035, 0.07), mix(vec3(0.52, 0.66, 0.83), vec3(1.05, 0.48, 0.19), gold), day);
    vec3 sky = mix(top, rim, horizon * 0.88);
    sky += directColour() * toward * (0.16 + gold * 0.48) * day;
    float disc = smoothstep(cos(0.024), cos(0.014), dot(rd, sun));
    sky += directColour() * disc * 12.0 * (1.0 - rainStrength * 0.8);
    float moon = smoothstep(cos(0.016), cos(0.010), dot(rd, -sun));
    sky += vec3(0.45, 0.55, 0.85) * moon * (1.0 - day);
    // A soft 2D cloud layer, not volumetric clouds. Same sky is used by reflections.
    if (rd.y > 0.025) {
        float t = max(70.0, 190.0 - cameraPosition.y) / max(rd.y, 0.025);
        vec2 uv = (cameraPosition.xz + rd.xz * t) * 0.0028 + vec2(frameTimeCounter * 0.003, 0.0);
        float cloud = smoothstep(0.48, 0.71, cloudNoise(uv));
        cloud *= smoothstep(0.025, 0.16, rd.y);
        float edge = clamp((cloudNoise(uv + sun.xz * 0.16) - cloudNoise(uv)) * 5.0 + 0.5, 0.0, 1.0);
        vec3 cloudLight = mix(vec3(0.018, 0.025, 0.05), mix(vec3(0.8), vec3(1.22, 0.67, 0.36), gold), day);
        sky = mix(sky, cloudLight * mix(0.6, 1.2, edge), cloud * 0.9);
    }
    sky = mix(sky, vec3(dot(sky, vec3(0.2126, 0.7152, 0.0722))) * 0.7, rainStrength * 0.6);
    return max(sky, vec3(0.0));
}
vec3 viewPosition(vec2 uv, float depth) {
    vec4 p = gbufferProjectionInverse * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
}
vec3 viewRayWorld(vec2 uv) { return worldDirection(viewPosition(uv, 1.0)); }
#endif
