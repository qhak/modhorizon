#version 120
/* DRAWBUFFERS:1 */
#include "/lib/lighting.glsl"
uniform sampler2D texture;
uniform sampler2D colortex4;
uniform sampler2D depthtex1;
uniform mat4 gbufferModelView;
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
varying vec3 vPlayer;
varying vec3 vNormal;
varying float vMaterial;
vec3 traceScene(vec3 origin, vec3 ray, vec3 fallback) {
    float previousDifference = -1.0;
    vec3 previousPoint = origin;
    for (int i = 1; i <= 48; ++i) {
        float f = float(i) / 48.0;
        float travel = 0.14 + f * f * 144.0;
        vec3 point = origin + ray * travel;
        vec4 clip = gbufferProjection * vec4(point, 1.0);
        if (clip.w < 0.05) break;
        vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
        if (any(lessThan(uv, vec2(0.005))) || any(greaterThan(uv, vec2(0.995)))) break;
        float depth = texture2D(depthtex1, uv).r;
        float difference = depth < 0.99999 ? viewPosition(uv, depth).z - point.z : -1000.0;
        if (difference >= 0.0 && previousDifference < 0.0) {
            vec3 low = previousPoint, high = point;
            for (int j = 0; j < 5; ++j) {
                vec3 mid = (low + high) * 0.5;
                vec4 c = gbufferProjection * vec4(mid, 1.0);
                vec2 u = c.xy / c.w * 0.5 + 0.5;
                float d = texture2D(depthtex1, u).r;
                if (d < 0.99999 && viewPosition(u, d).z - mid.z >= 0.0) high = mid; else low = mid;
            }
            vec4 c = gbufferProjection * vec4(high, 1.0);
            vec2 hit = c.xy / c.w * 0.5 + 0.5;
            float sceneZ = viewPosition(hit, texture2D(depthtex1, hit).r).z;
            if (abs(sceneZ - high.z) < 0.7 + travel * 0.025) {
                float edge = smoothstep(0.005, 0.08, min(min(hit.x, hit.y), min(1.0 - hit.x, 1.0 - hit.y)));
                return mix(fallback, texture2D(colortex4, hit).rgb, edge);
            }
        }
        previousPoint = point; previousDifference = difference;
    }
    return fallback;
}
void main() {
    vec4 texel = texture2D(texture, vUV) * vColour;
    if (texel.a < 0.01) discard;
    vec3 n = normalize(vNormal);
    if (abs(vMaterial - 1001.0) > 0.5) {
        vec3 colour = lightSurface(toLinear(texel.rgb), n, vPlayer, vLM, 1.0, 1.0);
        gl_FragData[0] = vec4(colour, clamp(texel.a, 0.0, 1.0));
        return;
    }
    vec3 absolutePosition = vPlayer + cameraPosition;
    float t = frameTimeCounter;
    vec2 p = absolutePosition.xz;
    vec2 slopes = vec2(cos(dot(p, vec2(0.70, 0.40)) + t * 0.8), cos(dot(p, vec2(-0.45, 0.80)) - t * 0.65));
    n = normalize(n + vec3(slopes.x, 0.0, slopes.y) * WATER_WAVES);
    vec3 view = (gbufferModelView * vec4(vPlayer, 1.0)).xyz;
    vec3 eye = normalize(-view), normalView = normalize(mat3(gbufferModelView) * n);
    if (dot(normalView, eye) < 0.0) { normalView = -normalView; n = -n; }
    vec3 reflectedView = reflect(-eye, normalView);
    vec3 reflectedWorld = worldDirection(reflectedView);
    vec3 reflection = traceScene(view + normalView * 0.12, reflectedView, skyRadiance(reflectedWorld));
    vec2 screen = gl_FragCoord.xy / vec2(viewWidth, viewHeight);
    vec2 refracted = clamp(screen + normalView.xy * 0.012, vec2(0.002), vec2(0.998));
    float bedDepth = texture2D(depthtex1, refracted).r;
    vec3 bed = viewPosition(refracted, bedDepth);
    if (bedDepth < gl_FragCoord.z) { refracted = screen; bed = viewPosition(screen, texture2D(depthtex1, screen).r); }
    float thickness = clamp(length(bed - view), 0.0, 24.0);
    vec3 transmitted = texture2D(colortex4, refracted).rgb;
    vec3 transmission = exp(-vec3(0.20, 0.065, 0.035) * thickness);
    vec3 waterTint = vec3(0.025, 0.16, 0.19) * mix(0.12, 0.8, daylight());
    transmitted = transmitted * transmission + waterTint * (1.0 - transmission);
    float fresnel = 0.025 + 0.975 * pow(1.0 - max(dot(normalView, eye), 0.0), 5.0);
    vec3 colour = mix(transmitted, reflection, fresnel);
    vec3 halfVector = normalize(normalize(shadowLightPosition) + eye);
    float sparkle = pow(max(dot(normalView, halfVector), 0.0), 220.0);
    colour += directColour() * sparkle * daylight() * 8.0 * shadowVisibility(vPlayer, n, worldDirection(shadowLightPosition));
    // Refraction already contains the bed: opaque output avoids applying alpha twice.
    gl_FragData[0] = vec4(colour, 1.0);
}
