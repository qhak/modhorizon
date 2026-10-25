#ifndef MH_WATER_BALANCE_GLSL
#define MH_WATER_BALANCE_GLSL
// Neutral Beer-style attenuation, not spectral transport or refraction.
// Return straight RGB for SRC_ALPHA blending into the premultiplied overlay.
vec4 mhWaterLayer(vec3 reflected, vec3 scatter, float pathLength, float nDotV) {
    float transmission = exp(-max(pathLength, 0.0) * 0.22);
    // Artist-selected base reflectance with Schlick angular response.
    float fresnel = 0.035 + 0.965 * pow(1.0 - clamp(nDotV, 0.0, 1.0), 5.0);
    float coverage = 1.0 - (1.0 - fresnel) * transmission;
    vec3 premultiplied = reflected * fresnel
        + scatter * (1.0 - fresnel) * (1.0 - transmission);
    return vec4(premultiplied / max(coverage, 0.00001), coverage);
}
#endif
