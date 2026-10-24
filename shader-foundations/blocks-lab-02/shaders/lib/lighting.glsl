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

// Terrain-only extension: the approved water/other-surface lighting path above is unchanged.
vec2 terrainMaterialResponse(float material) {
    // Roughness and approximate metallic fraction.
    if (abs(material - 1003.0) < 0.5) return vec2(0.88, 0.0); // rough stone
    if (abs(material - 1004.0) < 0.5) return vec2(0.72, 0.0); // timber
    if (abs(material - 1005.0) < 0.5) return vec2(0.34, 0.9); // metal blocks
    if (abs(material - 1006.0) < 0.5) return vec2(0.98, 0.0); // soil/sand
    if (abs(material - 1007.0) < 0.5) return vec2(0.44, 0.0); // polished stone
    return vec2(0.94, 0.0);
}
vec3 terrainHighlight(vec3 albedo, vec3 normal, vec3 eye, vec3 light, float roughness, float metallic, float dielectricF0) {
    float nl = max(dot(normal, light), 0.0), nv = max(dot(normal, eye), 0.001);
    vec3 halfDirection = light + eye;
    if (length(halfDirection) < 0.0001) return vec3(0.0);
    vec3 h = normalize(halfDirection);
    float nh = max(dot(normal, h), 0.0), vh = max(dot(eye, h), 0.0);
    float a = roughness * roughness, a2 = a * a;
    float denominator = nh * nh * (a2 - 1.0) + 1.0;
    float distribution = a2 / max(MH_PI * denominator * denominator, 0.0001);
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float geometry = (nl / max(nl * (1.0 - k) + k, 0.001)) * (nv / (nv * (1.0 - k) + k));
    vec3 f0 = mix(vec3(dielectricF0), clamp(albedo * 2.5, vec3(0.25), vec3(0.95)), metallic);
    vec3 fresnel = f0 + (1.0 - f0) * pow(1.0 - vh, 5.0);
    return min(distribution * geometry * fresnel / max(4.0 * nv, 0.001), vec3(2.5));
}
vec3 lightTerrainMaterial(vec3 albedo, vec3 geometricNormal, vec3 detailNormal, vec3 playerPosition, vec2 lm, float ao, float material, vec4 surfaceSample) {
    vec2 response = terrainMaterialResponse(material);
    float dielectricF0 = 0.04;
    if (material > 12000.5 && material < 12010.5) {
        // GGX helper squares perceptual roughness internally. Only dielectric
        // fixtures are supported; this is not a complete LabPBR shader decoder.
        response = vec2(clamp(1.0 - surfaceSample.r, 0.18, 1.0), 0.0);
        dielectricF0 = clamp(surfaceSample.g, 0.02, 0.20);
    }
    vec3 diffuseAlbedo = albedo * (1.0 - response.y * 0.55);
    vec3 colour = lightSurface(diffuseAlbedo, geometricNormal, playerPosition, lm, ao, 1.0);
    vec3 light = worldDirection(shadowLightPosition);
    vec3 toEye = gbufferModelViewInverse[3].xyz - playerPosition;
    vec3 eye = toEye / max(length(toEye), 0.0001);
    // Geometric normal, not inferred detail, controls shadow lookup/bias.
    float visibility = shadowVisibility(playerPosition, geometricNormal, light);
    float sky = clamp((lm.y - 0.03125) / 0.9375, 0.0, 1.0);
    vec3 incident = mix(vec3(0.22, 0.31, 0.52) * 0.22, directColour() * SUN_INTENSITY, daylight());
    incident *= visibility * smoothstep(0.65, 0.98, sky) * (1.0 - rainStrength * 0.85);
    float diffuseChange = max(dot(detailNormal, light), 0.0) - max(dot(geometricNormal, light), 0.0);
    colour += diffuseAlbedo * incident * diffuseChange * mix(0.78, 1.0, ao);
    colour += terrainHighlight(albedo, detailNormal, eye, light, response.x, response.y, dielectricF0) * incident * MATERIAL_HIGHLIGHTS;
    return max(colour, vec3(0.0));
}
