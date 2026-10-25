#version 120
/* DRAWBUFFERS:0 */
uniform sampler2D texture;
uniform float alphaTestRef;
varying vec2 vUV;
varying float vMaterial;
const int shadowMapResolution = 2048;
const float shadowDistance = 96.0;
const float shadowDistanceRenderMul = 1.0;
const float sunPathRotation = -25.0;
const float shadowIntervalSize = 2.0;
void main() {
    if (abs(vMaterial - 1001.0) < 0.5 || abs(vMaterial - 1002.0) < 0.5) discard;
    if (texture2D(texture, vUV).a < max(alphaTestRef, 0.1)) discard;
    gl_FragData[0] = vec4(1.0);
}
