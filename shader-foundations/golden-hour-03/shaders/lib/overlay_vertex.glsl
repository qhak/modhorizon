#ifndef MH_OVERLAY_VERTEX_GLSL
#define MH_OVERLAY_VERTEX_GLSL
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
void mhOverlayVertex() {
    gl_Position = ftransform();
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vLM = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    vColour = gl_Color;
}
#endif
