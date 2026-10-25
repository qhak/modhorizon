#ifndef MH_ORE_BLOOM_GLSL
#define MH_ORE_BLOOM_GLSL
uniform sampler2D colortex6;
uniform sampler2D colortex1;
uniform sampler2D depthtex0;
uniform sampler2D depthtex1;
uniform float viewWidth;
uniform float viewHeight;
#define ORE_HALO_STRENGTH 0.32 // [0.0 0.16 0.32 0.48]
vec3 mhOreHaloTap(vec2 uv, float receiverDepth) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec3(0.0);
    float sourceDepth = texture2D(depthtex1, uv).r;
    if (sourceDepth >= 0.999999 || sourceDepth > receiverDepth + 0.00001) return vec3(0.0);
    // A nearer solid/translucent overlay must not reveal hidden ore emission.
    float overlay = clamp(texture2D(colortex1, uv).a, 0.0, 1.0);
    return texture2D(colortex6, uv).rgb * (1.0 - overlay);
}
vec3 mhOreHalo(vec2 uv) {
    vec2 pixel = 1.0 / max(vec2(viewWidth, viewHeight), vec2(1.0));
    float receiverDepth = min(texture2D(depthtex0, uv).r, texture2D(depthtex1, uv).r);
    vec3 halo = vec3(0.0);
    for (int radiusIndex = 0; radiusIndex < 3; ++radiusIndex) {
        float radius = 1.0 + float(radiusIndex) * 2.0;
        float weight = 1.0 / (1.0 + float(radiusIndex));
        halo += mhOreHaloTap(uv + vec2(pixel.x * radius, 0.0), receiverDepth) * weight;
        halo += mhOreHaloTap(uv - vec2(pixel.x * radius, 0.0), receiverDepth) * weight;
        halo += mhOreHaloTap(uv + vec2(0.0, pixel.y * radius), receiverDepth) * weight;
        halo += mhOreHaloTap(uv - vec2(0.0, pixel.y * radius), receiverDepth) * weight;
    }
    float receiverOverlay = clamp(texture2D(colortex1, uv).a, 0.0, 1.0);
    return halo * (ORE_HALO_STRENGTH / 7.333333) * (1.0 - receiverOverlay);
}
#endif
