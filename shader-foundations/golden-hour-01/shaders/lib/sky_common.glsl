#ifndef MH_SKY_COMMON_GLSL
#define MH_SKY_COMMON_GLSL
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferModelView;
uniform vec3 sunPosition;
uniform float rainStrength;
uniform float frameTimeCounter;
uniform vec3 cameraPosition;
float mhHash2(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}
float mhNoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = mhHash2(i);
    float b = mhHash2(i + vec2(1.0, 0.0));
    float c = mhHash2(i + vec2(0.0, 1.0));
    float d = mhHash2(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float mhFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; ++i) {
        value += amplitude * mhNoise2(p);
        p = p * 2.03 + vec2(13.7, 7.1);
        amplitude *= 0.5;
    }
    return value;
}
float mhHash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
vec3 worldSunDirection() {
    return normalize(mat3(gbufferModelViewInverse) * sunPosition);
}
vec3 worldUpDirection() {
    return vec3(0.0, 1.0, 0.0);
}
float solarElevation() {
    return dot(worldSunDirection(), worldUpDirection());
}
float dayAmount() {
    return smoothstep(-0.12, 0.18, solarElevation());
}
float sunsetAmount() {
    float lowSun = 1.0 - smoothstep(0.025, 0.40, abs(solarElevation()));
    return lowSun * (1.0 - clamp(rainStrength, 0.0, 1.0) * 0.45);
}
vec3 skyColorWorld(vec3 worldDir) {
    vec3 dir = normalize(worldDir);
    vec3 up = worldUpDirection();
    float h = dot(dir, up);
    float day = dayAmount();
    float rain = clamp(rainStrength, 0.0, 1.0);
    float sunset = sunsetAmount();
    vec3 upperNight = vec3(0.008, 0.015, 0.045);
    vec3 horizonNight = vec3(0.030, 0.047, 0.085);
    vec3 upperDay = vec3(0.16, 0.36, 0.64);
    vec3 horizonDay = vec3(0.68, 0.76, 0.86);
    vec3 upper = mix(upperNight, upperDay, day);
    vec3 horizon = mix(horizonNight, horizonDay, day);
    float horizonBlend = exp(-max(h, 0.0) * 3.0);
    vec3 color = mix(upper, horizon, clamp(horizonBlend, 0.0, 1.0));
    float warmBand = sunset * smoothstep(-0.16, 0.04, h) * (1.0 - smoothstep(0.08, 0.48, h));
    color = mix(color, vec3(1.0, 0.48, 0.25), warmBand * 0.78);
    if (h < -0.04) {
        vec3 lower = mix(vec3(0.004, 0.007, 0.015), horizonNight, smoothstep(-0.48, -0.04, h));
        color = mix(lower, color, smoothstep(-0.10, 0.015, h));
    }
    vec3 sunDir = worldSunDirection();
    float sunDot = max(dot(dir, sunDir), 0.0);
    vec3 sunTint = mix(vec3(1.0, 0.83, 0.63), vec3(1.0, 0.97, 0.86), smoothstep(0.02, 0.36, solarElevation()));
    float broadGlow = pow(sunDot, 10.0) * 0.045 + pow(sunDot, 34.0) * 0.13;
    color += sunTint * broadGlow * day;
    float disc = smoothstep(cos(0.0105), cos(0.0070), sunDot) * day;
    color += sunTint * disc * 2.1;
    vec2 cloudPoint = dir.xz / max(h, 0.10) * 3.2;
    cloudPoint += vec2(frameTimeCounter * 0.0017, frameTimeCounter * 0.0008);
    vec2 warp = vec2(mhFbm(cloudPoint * 0.43 + 3.1), mhFbm(cloudPoint * 0.43 + 17.8)) - 0.5;
    float cloudNoise = mhFbm((cloudPoint + warp * 1.65) * 0.86);
    float threshold = mix(0.60, 0.48, rain);
    float cloud = smoothstep(threshold, threshold + 0.105, cloudNoise) * smoothstep(-0.04, 0.13, h);
    cloud *= 0.58;
    vec3 cloudColor = mix(vec3(0.20, 0.25, 0.36), vec3(0.80, 0.83, 0.85), day);
    cloudColor = mix(cloudColor, vec3(1.0, 0.59, 0.37), sunset * 0.82);
    cloudColor = mix(cloudColor, vec3(0.27, 0.31, 0.37), rain * 0.65);
    color = mix(color, cloudColor, cloud);
    float moonDot = max(dot(dir, -sunDir), 0.0);
    float night = 1.0 - smoothstep(-0.18, 0.10, solarElevation());
    float moonDisc = smoothstep(cos(0.0090), cos(0.0055), moonDot) * night;
    color += vec3(0.48, 0.57, 0.76) * moonDisc * 0.9;
    vec3 starCell = floor(dir * 470.0);
    vec3 localStar = fract(dir * 470.0);
    float starSeed = mhHash3(starCell);
    vec3 starCenter = vec3(mhHash3(starCell + vec3(1.0, 0.0, 0.0)), mhHash3(starCell + vec3(0.0, 1.0, 0.0)), mhHash3(starCell + vec3(0.0, 0.0, 1.0)));
    float star = (1.0 - smoothstep(0.035, 0.12, length(localStar - starCenter))) * step(0.986, starSeed);
    color += vec3(0.52, 0.62, 0.86) * star * night * (1.0 - cloud);
    color = mix(color, vec3(0.30, 0.34, 0.40), rain * 0.20);
    return max(color, vec3(0.0));
}
#endif
