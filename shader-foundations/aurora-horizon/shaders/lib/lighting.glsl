#include "/lib/common.glsl"
uniform sampler2D shadowtex0;
uniform mat4 shadowModelView;
uniform mat4 shadowProjection;
// Unwarped shadow projection: precisely the same transform as shadow.vsh.
float shadowVisibility(vec3 playerPosition, vec3 normal, vec3 lightDirection) {
    vec4 sp = shadowProjection * shadowModelView * vec4(playerPosition + normal * 0.055, 1.0);
    vec3 uvz = sp.xyz / sp.w * 0.5 + 0.5;
    if (any(lessThan(uvz, vec3(0.002))) || any(greaterThan(uvz, vec3(0.998)))) return 1.0;
    float bias = 0.00030 + (1.0 - max(dot(normal, lightDirection), 0.0)) * 0.00065;
    float visibility = 0.0;
    for (int x = -1; x <= 1; ++x) for (int y = -1; y <= 1; ++y) {
        float depth = texture2D(shadowtex0, uvz.xy + vec2(float(x), float(y)) * (1.45 / 2048.0)).r;
        visibility += step(uvz.z - bias, depth);
    }
    float fade = smoothstep(65.0, 90.0, length(playerPosition.xz));
    return mix(visibility / 9.0, 1.0, fade);
}
vec3 lightSurface(vec3 albedo, vec3 normal, vec3 playerPosition, vec2 lm, float ao, float receiveShadow) {
    vec3 n = normalize(normal), lightDirection = worldDirection(shadowLightPosition);
    float day = daylight();
    float sky = clamp((lm.y - 0.03125) / 0.9375, 0.0, 1.0);
    float block = clamp((lm.x - 0.03125) / 0.9375, 0.0, 1.0);
    float diffuse = max(dot(n, lightDirection), 0.0);
    float visible = mix(1.0, shadowVisibility(playerPosition, n, lightDirection), receiveShadow);
    float hemisphere = mix(0.50, 1.0, n.y * 0.5 + 0.5);
    vec3 ambient = mix(vec3(0.045, 0.065, 0.12), vec3(0.42, 0.55, 0.76), day);
    ambient *= AMBIENT_STRENGTH * mix(0.06, 1.0, pow(sky, 1.5)) * hemisphere;
    vec3 direct = mix(vec3(0.22, 0.31, 0.52) * 0.22, directColour() * SUN_INTENSITY, day);
    direct *= diffuse * visible * smoothstep(0.65, 0.98, sky) * (1.0 - rainStrength * 0.85);
    vec3 torch = vec3(1.0, 0.48, 0.15) * pow(block, 3.0) * 3.1;
    return albedo * (ambient * mix(0.42, 1.0, ao) + direct * mix(0.78, 1.0, ao) + torch + vec3(0.012));
}
