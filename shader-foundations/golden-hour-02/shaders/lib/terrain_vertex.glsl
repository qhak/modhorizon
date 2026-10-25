#ifndef MH_TERRAIN_VERTEX_GLSL
#define MH_TERRAIN_VERTEX_GLSL
#include "/lib/sky_common.glsl"
#include "/lib/terrain_varyings.glsl"
attribute vec4 mc_Entity;
void mhTerrainVertex() {
    gl_Position = ftransform();
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vLM = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    vColour = gl_Color;
    vec4 viewPos = gl_ModelViewMatrix * gl_Vertex;
    vViewPos = viewPos.xyz;
    vPlayer = (gbufferModelViewInverse * viewPos).xyz;
    vNormalView = normalize(gl_NormalMatrix * gl_Normal);
    vNormalPlayer = normalize(mat3(gbufferModelViewInverse) * vNormalView);
    vMaterial = mc_Entity.x;
}
#endif
