#version 120
const int shadowMapResolution = 2048;
const float shadowDistance = 128.0;
const float shadowIntervalSize = 2.0;
const float sunPathRotation = 0.0;
varying vec2 vUV;
varying vec4 vColour;
void main() {
    gl_Position = ftransform();
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vColour = gl_Color;
}
