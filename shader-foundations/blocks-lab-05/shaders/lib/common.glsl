#ifndef MH_COMMON
#define MH_COMMON
// Original ModHorizon renderer. Look controls; buffer contracts are not look controls.
#define SUN_INTENSITY 3.2 // [2.0 2.6 3.2 3.8]
#define AMBIENT_STRENGTH 0.32 // [0.20 0.26 0.32 0.42]
#define FOG_DENSITY 0.0035 // [0.0015 0.0025 0.0035 0.0050]
#define WATER_WAVES 0.045 // [0.015 0.030 0.045 0.060]
#define BLOOM_STRENGTH 0.10 // [0.0 0.05 0.10 0.15]
#define EXPOSURE 1.05 // [0.85 1.0 1.05 1.15]
#define SURFACE_RELIEF 0.065 // [0.0 0.035 0.065 0.09]
#define MATERIAL_HIGHLIGHTS 1.0 // [0.0 0.5 1.0 1.5]
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
    float day = daylight();
    float dusk = exp(-pow((sun.y - 0.015) / 0.23, 2.0));
    float above = smoothstep(-0.04, 0.75, rd.y);
    float toward = pow(max(dot(rd, sun), 0.0), 6.0);
    vec3 zenith = mix(vec3(0.004, 0.009, 0.026), vec3(0.045, 0.16, 0.42), day);
    vec3 horizon = mix(vec3(0.018, 0.027, 0.060), vec3(0.32, 0.52, 0.76), day);
    horizon = mix(horizon, vec3(0.90, 0.48, 0.28), dusk * (0.45 + 0.45 * toward));
    vec3 sky = mix(horizon, zenith, pow(above, 0.55));
    // Lower sky blends continuously into the same horizon, not a solid band.
    sky = mix(horizon * 0.65, sky, smoothstep(-0.65, 0.02, rd.y));
    sky += vec3(1.0, 0.68, 0.39) * toward * dusk * 0.30;
    float sunDot = dot(rd, sun);
    float disc = smoothstep(cos(0.010), cos(0.008), sunDot);
    sky += directColour() * disc * 7.0 * (1.0 - rainStrength * 0.85);
    float moon = smoothstep(cos(0.010), cos(0.008), dot(rd, -sun));
    sky += vec3(0.24, 0.31, 0.46) * moon * (1.0 - day);
    if (rd.y > 0.02) {
        float cloudHeight = max(60.0, 200.0 - cameraPosition.y);
        vec2 uv = (cameraPosition.xz + rd.xz * cloudHeight / max(rd.y, 0.02)) * 0.0022;
        uv += vec2(frameTimeCounter * 0.0015, 0.0);
        float coverage = smoothstep(0.53, 0.75, cloudNoise(uv));
        coverage *= smoothstep(0.02, 0.15, rd.y);
        float edge = clamp(0.55 + (cloudNoise(uv + sun.xz * 0.22) - cloudNoise(uv)) * 3.0, 0.0, 1.0);
        vec3 cloudDay = mix(vec3(0.38, 0.48, 0.62), vec3(0.95, 0.98, 1.04), edge);
        cloudDay = mix(cloudDay, vec3(1.0, 0.65, 0.43) * mix(0.65, 1.0, edge), dusk * 0.7);
        vec3 cloud = mix(vec3(0.014, 0.021, 0.040), cloudDay, day);
        sky = mix(sky, cloud, coverage * 0.80);
    }
    float grey = dot(sky, vec3(0.2126, 0.7152, 0.0722));
    return max(mix(sky, vec3(grey) * 0.78, rainStrength * 0.70), vec3(0.0));
}
vec3 viewPosition(vec2 uv, float depth) {
    vec4 p = gbufferProjectionInverse * vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
    return p.xyz / p.w;
}
vec3 viewRayWorld(vec2 uv) { return worldDirection(viewPosition(uv, 1.0)); }
#endif
