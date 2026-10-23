uniform mat4 gbufferModelViewInverse;
varying vec2 vUV;
varying vec2 vLM;
varying vec4 vColour;
varying vec3 vPlayer;
varying vec3 vNormal;
void mhVertex() {
    gl_Position = ftransform();
    vUV = (gl_TextureMatrix[0] * gl_MultiTexCoord0).xy;
    vLM = (gl_TextureMatrix[1] * gl_MultiTexCoord1).xy;
    vColour = gl_Color;
    vec4 view = gl_ModelViewMatrix * gl_Vertex;
    vPlayer = (gbufferModelViewInverse * view).xyz;
    vec3 vn = gl_NormalMatrix * gl_Normal;
    vNormal = mat3(gbufferModelViewInverse) * vn;
}
