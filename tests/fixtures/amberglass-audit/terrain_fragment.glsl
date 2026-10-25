#include "/lib/terrain_fragment_io.glsl"
#include "/lib/terrain_lighting.glsl"
uniform sampler2D texture;
uniform sampler2D lightmap;
uniform float alphaTestRef;
void mhTerrainFragment() {
    vec4 texel = texture2D(texture, vTerrainUV) * vTerrainColor;
    if (texel.a < max(alphaTestRef, 0.10)) discard;
    vec2 light = texture2D(lightmap, vTerrainLM).rg;
    float skyLight = pow(clamp(light.g, 0.0, 1.0), 1.35);
    float blockLight = pow(clamp(light.r, 0.0, 1.0), 1.8);
    vec3 n = normalize(vTerrainNormal);
    vec3 sunDir = normalize(shadowLightPosition);
    float diffuse = max(dot(n, sunDir), 0.0);
    vec3 upView = normalize(mat3(gbufferModelView) * vec3(0.0, 1.0, 0.0));
    float solarElevation = dot(normalize(sunPosition), upView);
    float day = smoothstep(-0.12, 0.18, solarElevation);
    float dusk = smoothstep(-0.08, 0.06, solarElevation) * (1.0 - smoothstep(0.12, 0.42, solarElevation));
    vec3 sunTint = mix(vec3(1.0, 0.69, 0.40), vec3(1.0, 0.91, 0.78), smoothstep(0.02, 0.38, solarElevation));
    float visibility = mhShadowVisibility(vTerrainPlayerPos, n, sunDir);
    float shadowedDirect = diffuse * visibility * day * smoothstep(0.04, 0.30, skyLight) * (1.0 - rainStrength * 0.78);
    vec3 ambientDay = vec3(0.205, 0.255, 0.335) * skyLight * (0.45 + 0.55 * day);
    vec3 ambientNight = vec3(0.026, 0.038, 0.075) * skyLight;
    vec3 ambient = ambientDay + ambientNight;
    vec3 direct = sunTint * (0.82 + dusk * 0.12) * shadowedDirect;
    vec3 torch = vec3(1.0, 0.48, 0.20) * blockLight * 1.10;
    vec3 rgb = texel.rgb * (ambient + direct + torch + vec3(0.012));
    float fogFactor = clamp((gl_Fog.end - gl_FogFragCoord) / max(gl_Fog.end - gl_Fog.start, 0.001), 0.0, 1.0);
    vec3 fogColor = gl_Fog.color.rgb;
    fogColor = mix(fogColor, fogColor * vec3(1.06, 0.96, 0.86), dusk * 0.18);
    rgb = mix(fogColor, rgb, fogFactor);
    gl_FragColor = vec4(rgb, texel.a);
}
