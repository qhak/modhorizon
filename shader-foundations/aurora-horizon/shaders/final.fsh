#version 120
#include "/lib/common.glsl"
uniform sampler2D colortex0;
varying vec2 vUV;
vec3 filmic(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
void main() {
    vec3 colour = texture2D(colortex0, vUV).rgb;
    vec3 bloom = vec3(0.0);
    for (int i = 0; i < 8; ++i) {
        float angle = float(i) * MH_PI / 4.0;
        vec2 direction = vec2(cos(angle), sin(angle)) / vec2(viewWidth, viewHeight);
        vec3 nearSample = texture2D(colortex0, clamp(vUV + direction * 3.0, vec2(0.001), vec2(0.999))).rgb;
        vec3 farSample = texture2D(colortex0, clamp(vUV + direction * 8.0, vec2(0.001), vec2(0.999))).rgb;
        bloom += max(nearSample - 1.0, vec3(0.0)) * 0.65 + max(farSample - 1.0, vec3(0.0)) * 0.35;
    }
    colour = filmic((colour + bloom * BLOOM_STRENGTH / 8.0) * EXPOSURE);
    colour = pow(colour, vec3(1.0 / 2.2));
    float vignette = 1.0 - pow(length(vUV - 0.5), 2.0) * 0.12;
    gl_FragColor = vec4(colour * vignette, 1.0);
}
