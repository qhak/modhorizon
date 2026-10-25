#version 120
attribute vec4 mc_Entity;
varying float vMaterial;
#include "/lib/geometry_vertex.glsl"
void main() { mhVertex(); vMaterial = mc_Entity.x; }
