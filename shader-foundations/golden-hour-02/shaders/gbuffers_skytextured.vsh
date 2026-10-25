#version 120
varying vec2 vUV;
varying vec4 vColour;
void main() {
    gl_Position = ftransform();
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vColour = gl_Color;
}
