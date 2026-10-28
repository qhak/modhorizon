#ifndef MH_TERRAIN_LIGHTING_GLSL
#define MH_TERRAIN_LIGHTING_GLSL
#include "/lib/sky_common.glsl"
#include "/lib/lightmap.glsl"
uniform sampler2D shadowtex0;
uniform mat4 shadowModelView;
uniform mat4 shadowProjection;
float mhShadowVisibility(vec3 playerPosition, vec3 normalPlayer, vec3 lightPlayer) {
    vec4 shadowClip = shadowProjection * shadowModelView * vec4(playerPosition + normalPlayer * 0.045, 1.0);
    if (shadowClip.w <= 0.0) return 1.0;
    vec3 uvz = shadowClip.xyz / shadowClip.w * 0.5 + 0.5;
    if (any(lessThan(uvz, vec3(0.002))) || any(greaterThan(uvz, vec3(0.998)))) return 1.0;
    float bias = 0.00032 + (1.0 - max(dot(normalPlayer, lightPlayer), 0.0)) * 0.00062;
    float visibility = 0.0;
    for (int x = -1; x <= 1; ++x) {
        for (int y = -1; y <= 1; ++y) {
            vec2 tap = uvz.xy + vec2(float(x), float(y)) * (1.35 / 2048.0);
            float mapDepth = texture2D(shadowtex0, tap).r;
            visibility += step(uvz.z - bias, mapDepth);
        }
    }
    float distanceFade = smoothstep(90.0, 124.0, length(playerPosition));
    return mix(visibility / 9.0, 1.0, distanceFade);
}
vec3 mhLightSurface(vec3 albedo, vec3 normalPlayer, vec3 playerPosition, vec2 lm) {
    vec3 n = normalize(normalPlayer);
    vec3 sunDir = worldSunDirection();
    float elevation = solarElevation();
    float day = dayAmount();
    float skyExposure = clamp((lm.y - 0.03125) / 0.9375, 0.0, 1.0);
    float blockExposure = clamp((lm.x - 0.03125) / 0.9375, 0.0, 1.0);
    float hemisphere = mix(0.76, 1.0, max(n.y, 0.0));
    vec3 nightAmbient = vec3(0.050, 0.070, 0.125);
    vec3 dayAmbient = vec3(0.34, 0.43, 0.54);
    vec3 ambient = mix(nightAmbient, dayAmbient, day);
    // Twilight fill remains tied to sky exposure, preserving dark interiors.
    ambient += vec3(0.15, 0.17, 0.22) * mhSunsetLight();
    ambient *= mix(0.075, 1.0, pow(skyExposure, 1.35)) * hemisphere;
    float diffuse = max(dot(n, sunDir), 0.0);
    float visibility = mhShadowVisibility(playerPosition, n, sunDir);
    vec3 coolSun = vec3(0.72, 0.83, 1.0);
    vec3 warmSun = vec3(1.0, 0.68, 0.39);
    vec3 clearSun = vec3(1.0, 0.94, 0.82);
    vec3 directTint = mix(warmSun, clearSun, smoothstep(0.025, 0.36, elevation));
    directTint = mix(coolSun, directTint, day);
    float sunAmount = diffuse * visibility * day * (1.0 - rainStrength * 0.78);
    sunAmount *= mix(0.22, 1.0, smoothstep(0.08, 0.72, skyExposure));
    vec3 direct = directTint * sunAmount * (1.32 + mhSunsetLight() * 0.65);
    vec3 torch = vec3(1.0, 0.46, 0.16) * pow(blockExposure, 2.25) * 2.55;
    vec3 illumination = ambient + direct + torch + vec3(0.008);
    return albedo * illumination;
}
#endif
