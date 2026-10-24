#version 120
attribute vec4 mc_Entity;
varying vec2 vUV;
varying float vMaterial;
void main() {
    gl_Position = gl_ProjectionMatrix * gl_ModelViewMatrix * gl_Vertex;
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vMaterial = mc_Entity.x;
}
