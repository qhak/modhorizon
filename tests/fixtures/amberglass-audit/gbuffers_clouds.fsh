#version 120
/* DRAWBUFFERS:0 */
uniform sampler2D texture;
uniform vec3 sunPosition;
uniform float rainStrength;
varying vec2 vCloudUV;
varying vec4 vCloudColor;
varying vec3 vCloudDirection;
void main() {
    vec4 cloud = texture2D(texture, vCloudUV) * vCloudColor;
    if (cloud.a < 0.01) discard;
    vec3 sunDir = normalize(sunPosition);
    float sunUp = dot(sunDir, vec3(0.0, 1.0, 0.0));
    float sunset = smoothstep(-0.12, 0.04, sunUp) * (1.0 - smoothstep(0.10, 0.48, sunUp));
    float sunFacing = pow(max(dot(normalize(vCloudDirection), sunDir), 0.0), 3.0);
    vec3 warm = mix(vec3(1.0, 0.62, 0.34), vec3(1.0, 0.88, 0.72), smoothstep(0.0, 0.35, sunUp));
    vec3 rgb = cloud.rgb * mix(vec3(0.88, 0.91, 0.98), warm, sunset * 0.38 + sunFacing * 0.12);
    rgb *= 1.0 - rainStrength * 0.18;
    float fogFactor = clamp((gl_Fog.end - gl_FogFragCoord) / max(gl_Fog.end - gl_Fog.start, 0.001), 0.0, 1.0);
    rgb = mix(gl_Fog.color.rgb, rgb, fogFactor);
    gl_FragColor = vec4(rgb, cloud.a);
}
