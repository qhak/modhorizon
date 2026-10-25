#ifndef MH_SKY_COMMON_GLSL
#define MH_SKY_COMMON_GLSL
uniform mat4 gbufferModelViewInverse;
uniform mat4 gbufferModelView;
uniform vec3 sunPosition;
uniform float rainStrength;
uniform float frameTimeCounter;
uniform vec3 cameraPosition;
uniform float far;
uniform int isEyeInWater;
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
// Continuous horizon fade shared by opaque terrain and water.
float mhDistanceHaze(float distanceToEye) {
    float endDistance = max(far * 0.96, 16.0);
    return smoothstep(endDistance * 0.55, endDistance, distanceToEye);
}
vec2 mhCloudCoordinates(vec3 dir) {
    // Bounded dome avoids the near-horizon reciprocal-height streaks.
    return dir.xz / (0.65 + max(dir.y, 0.0)) * 3.4
        + vec2(frameTimeCounter * 0.002, frameTimeCounter * 0.0007);
}
float mhCloudDensity(vec2 p) {
    vec2 warp = vec2(mhFbm(p * 0.55 + 3.1), mhFbm(p * 0.55 + 17.8)) - 0.5;
    return mhFbm(p + warp * 0.65);
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
    float towardSun = pow(max(dot(dir, worldSunDirection()), 0.0), 4.0);
    float warmBand = sunset * exp(-pow(h / 0.30, 2.0));
    color = mix(color, vec3(0.88, 0.40, 0.23), warmBand * (0.24 + towardSun * 0.36));
    // Evaluate the same continuous blend on both sides of the horizon.
    // The old h < -0.04 branch jumped to a partially blended night lower sky.
    vec3 lowerHorizon = mix(horizon, vec3(0.88, 0.40, 0.23), sunset * (0.24 + towardSun * 0.36));
    vec3 lower = mix(upper * 0.40, lowerHorizon, smoothstep(-0.75, 0.0, h));
    color = mix(lower, color, smoothstep(-0.12, 0.04, h));
    vec3 sunDir = worldSunDirection();
    float sunDot = max(dot(dir, sunDir), 0.0);
    vec3 sunTint = mix(vec3(1.0, 0.83, 0.63), vec3(1.0, 0.97, 0.86), smoothstep(0.02, 0.36, solarElevation()));
    float broadGlow = pow(sunDot, 10.0) * 0.045 + pow(sunDot, 34.0) * 0.13;
    color += sunTint * broadGlow * day;
    float disc = smoothstep(cos(0.024), cos(0.020), sunDot) * day;
    color += sunTint * disc * 2.1;
    vec2 cloudPoint = mhCloudCoordinates(dir);
    float density = mhCloudDensity(cloudPoint);
    float threshold = mix(0.53, 0.45, rain);
    float cloud = smoothstep(threshold, threshold + 0.14, density) * smoothstep(0.01, 0.16, h);
    cloud *= 0.80;
    // Directional density contrast approximates cloud lighting; not scattering.
    float edgeLight = clamp(0.55 + (mhCloudDensity(cloudPoint + sunDir.xz * 0.25) - density) * 3.5, 0.0, 1.0);
    vec3 shadowCloud = mix(vec3(0.018, 0.025, 0.045), vec3(0.32, 0.39, 0.51), day);
    vec3 litCloud = mix(vec3(0.075, 0.090, 0.14), vec3(0.90, 0.94, 1.0), day);
    litCloud = mix(litCloud, vec3(0.95, 0.61, 0.39), sunset * day * 0.55);
    vec3 cloudColor = mix(shadowCloud, litCloud, edgeLight);
    cloudColor = mix(cloudColor, vec3(0.25, 0.29, 0.35), rain * 0.65);
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
