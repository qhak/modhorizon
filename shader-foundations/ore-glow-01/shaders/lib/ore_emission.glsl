#ifndef MH_ORE_EMISSION_GLSL
#define MH_ORE_EMISSION_GLSL
uniform sampler2D specular;
#define ORE_GLOW_STRENGTH 1.2 // [0.6 0.9 1.2 1.5]
float mhOreEmission(vec2 uv, float materialId) {
    // Exact block mapping bounds: unrelated blocks cannot become emissive.
    if (materialId < 20000.5 || materialId > 20018.5) return 0.0;
    float encoded = texture2D(specular, uv).a;
    // LabPBR alpha 254 is maximum emission; 255 is the no-emission sentinel.
    if (encoded >= 254.5 / 255.0) return 0.0;
    return clamp(encoded * (255.0 / 254.0), 0.0, 1.0);
}
float mhOreVisibility(float fog, float distanceToEye) {
    // Self brightness does not cancel far haze or underwater attenuation.
    float medium = isEyeInWater == 1 ? exp(-max(distanceToEye, 0.0) * 0.025) : 1.0;
    return (1.0 - clamp(fog, 0.0, 1.0)) * medium;
}
#endif
