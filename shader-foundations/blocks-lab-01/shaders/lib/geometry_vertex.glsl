uniform mat4 gbufferModelViewInverse;
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
varying vec3 vPlayer;
varying vec3 vNormal;
#ifdef MH_TERRAIN
attribute vec4 mc_Entity;
attribute vec4 at_tangent;
varying vec4 vTerrainTangent;
varying float vTerrainMaterial;
#endif
void mhVertex() {
    gl_Position = ftransform();
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vLM = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    vColour = gl_Color;
    vec4 view = gl_ModelViewMatrix * gl_Vertex;
    vPlayer = (gbufferModelViewInverse * view).xyz;
    vec3 vn = gl_NormalMatrix * gl_Normal;
    vNormal = mat3(gbufferModelViewInverse) * vn;
#ifdef MH_TERRAIN
    vTerrainMaterial = mc_Entity.x;
    vec3 viewTangent = gl_NormalMatrix * at_tangent.xyz;
    vTerrainTangent = vec4(mat3(gbufferModelViewInverse) * viewTangent, sign(at_tangent.w));
#endif
}
