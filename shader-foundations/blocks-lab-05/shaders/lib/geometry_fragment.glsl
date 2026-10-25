#include "/lib/lighting.glsl"
uniform sampler2D texture;
uniform float alphaTestRef;
#ifdef MH_ENTITY
uniform vec4 entityColor;
#endif
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
varying vec3 vPlayer;
varying vec3 vNormal;
#ifdef MH_TERRAIN
varying float vTerrainMaterial;
varying vec4 vTerrainTangent;
uniform sampler2D normals;
uniform sampler2D specular;
#define LAB_NORMAL_STRENGTH 1.0 // [0.0 0.5 1.0 1.5]
bool labMaterial(float id) { return id > 12000.5 && id < 12015.5; }
vec3 labDetailNormal(vec3 n, vec4 encoded) {
    vec3 t = vTerrainTangent.xyz - n * dot(n, vTerrainTangent.xyz);
    if (length(t) < 0.001 || abs(vTerrainTangent.w) < 0.001) return n;
    t = normalize(t);
    // DirectX Y-minus convention, matching Iris' cross(tangent, normal) basis.
    vec3 b = cross(t, n) * sign(vTerrainTangent.w);
    vec2 xy = (encoded.rg * 2.0 - 1.0) * LAB_NORMAL_STRENGTH;
    xy *= min(1.0, 0.8 / max(length(xy), 0.001));
    vec3 mapped = normalize(t * xy.x + b * xy.y + n * sqrt(max(1.0 - dot(xy, xy), 0.0)));
    float fade = 1.0 - smoothstep(20.0, 48.0, length(vPlayer));
    return normalize(mix(n, mapped, fade));
}
vec3 terrainDetailNormal(vec3 geometricNormal, vec3 textureColour, float material) {
    // Screen-space height derivatives: no adjacent atlas sprite is sampled.
    // Colour is not actual height data; keep the inference small and near-camera.
    float strength = 0.0;
    if (abs(material - 1003.0) < 0.5) strength = 1.0;
    if (abs(material - 1004.0) < 0.5) strength = 0.65;
    if (abs(material - 1006.0) < 0.5) strength = 0.45;
    float fade = 1.0 - smoothstep(16.0, 40.0, length(vPlayer));
    float height = dot(textureColour, vec3(0.2126, 0.7152, 0.0722));
    vec3 dx = dFdx(vPlayer), dy = dFdy(vPlayer);
    vec3 rx = cross(dy, geometricNormal), ry = cross(geometricNormal, dx);
    float determinant = dot(dx, rx);
    vec3 gradient = (rx * dFdx(height) + ry * dFdy(height)) * sign(determinant) / max(abs(determinant), 0.000001);
    gradient *= min(1.0, 2.0 / max(length(gradient), 0.00001));
    return normalize(geometricNormal - gradient * SURFACE_RELIEF * strength * fade);
}
#endif
void mhSurface() {
#ifdef MH_BASIC
    gl_FragData[0] = vec4(toLinear(vColour.rgb), vColour.a);
#else
    vec4 texel = texture2D(texture, vUV);
    float alpha = texel.a;
#ifndef MH_TERRAIN
    alpha *= vColour.a;
#endif
    vec3 albedo = toLinear(texel.rgb * vColour.rgb);
    vec3 n = length(vNormal) > 0.01 ? normalize(vNormal) : normalize(-vPlayer);
    float ao = 1.0;
#ifdef MH_TERRAIN
    ao = clamp(vColour.a, 0.0, 1.0);
#endif
    float shadows = 1.0;
#ifdef MH_PARTICLE
    shadows = 0.0;
#endif
#ifdef MH_TERRAIN
    // Always sample before alpha discard. Exact atlas UV: no neighbouring sprites.
    vec4 normalSample = texture2D(normals, vUV);
    vec4 surfaceSample = texture2D(specular, vUV);
    vec3 detailNormal = labMaterial(vTerrainMaterial) ? labDetailNormal(n, normalSample)
        : terrainDetailNormal(n, texel.rgb, vTerrainMaterial);
#endif
    // Derivatives above must execute before potentially divergent cutout discard.
    if (alpha < alphaTestRef) discard;
#ifdef MH_TERRAIN
    vec3 lit = lightTerrainMaterial(albedo, n, detailNormal, vPlayer, vLM, ao, vTerrainMaterial, surfaceSample);
#else
    vec3 lit = lightSurface(albedo, n, vPlayer, vLM, ao, shadows);
#endif
#ifdef MH_ENTITY
    lit = mix(lit, toLinear(entityColor.rgb), entityColor.a);
#endif
    gl_FragData[0] = vec4(lit, alpha);
#endif
}
