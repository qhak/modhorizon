#version 120
#include "/lib/sky_common.glsl"
varying vec3 vWorldDir;
varying vec4 vColour;
void main() {
    gl_Position = ftransform();
    vec3 viewPosition = (gl_ModelViewMatrix * gl_Vertex).xyz;
    vWorldDir = normalize(mat3(gbufferModelViewInverse) * viewPosition);
    vColour = gl_Color;
}
