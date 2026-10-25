"""Local revision of the retained generated-and-checked GoldenHour source.

No provider call. Original source stays intact for measured before/after tests.
"""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]

def build():
    dest = ROOT / 'shader-foundations/golden-hour-02'
    shutil.copytree(ROOT / 'shader-foundations/golden-hour-01', dest, dirs_exist_ok=True)
    p = dest / 'shaders/lib/sky_common.glsl'
    s = p.read_text(encoding='utf-8')
    s = s.replace('uniform vec3 cameraPosition;', 'uniform vec3 cameraPosition;\nuniform float far;\nuniform int isEyeInWater;')
    marker = 'vec3 skyColorWorld('
    s = s.replace(marker, '''// Continuous horizon fade shared by opaque terrain and water.
float mhDistanceHaze(float distanceToEye) {
    float endDistance = max(far * 0.96, 16.0);
    return smoothstep(endDistance * 0.55, endDistance, distanceToEye);
}
vec2 mhCloudCoordinates(vec3 dir) {
    // Bounded dome avoids the near-horizon reciprocal-height streaks.
    return dir.xz / (0.65 + max(dir.y, 0.0)) * 3.4
        + vec2(frameTimeCounter * 0.002, frameTimeCounter * 0.0007);
}
float mhCloudDensity(vec2 p) {
    vec2 warp = vec2(mhFbm(p * 0.55 + 3.1), mhFbm(p * 0.55 + 17.8)) - 0.5;
    return mhFbm(p + warp * 0.65);
}
''' + marker, 1)
    start = s.index('    float warmBand =')
    end = s.index('    vec3 sunDir =', start)
    s = s[:start] + '''    float towardSun = pow(max(dot(dir, worldSunDirection()), 0.0), 4.0);
    float warmBand = sunset * exp(-pow(h / 0.30, 2.0));
    color = mix(color, vec3(0.88, 0.40, 0.23), warmBand * (0.24 + towardSun * 0.36));
    // Evaluate the same continuous blend on both sides of the horizon.
    // The old h < -0.04 branch jumped to a partially blended night lower sky.
    vec3 lowerHorizon = mix(horizon, vec3(0.88, 0.40, 0.23), sunset * (0.24 + towardSun * 0.36));
    vec3 lower = mix(upper * 0.40, lowerHorizon, smoothstep(-0.75, 0.0, h));
    color = mix(lower, color, smoothstep(-0.12, 0.04, h));
''' + s[end:]
    s = s.replace('smoothstep(cos(0.0105), cos(0.0070), sunDot)', 'smoothstep(cos(0.024), cos(0.020), sunDot)')
    start = s.index('    vec2 cloudPoint =')
    end = s.index('    float moonDot =', start)
    s = s[:start] + '''    vec2 cloudPoint = mhCloudCoordinates(dir);
    float density = mhCloudDensity(cloudPoint);
    float threshold = mix(0.53, 0.45, rain);
    float cloud = smoothstep(threshold, threshold + 0.14, density) * smoothstep(0.01, 0.16, h);
    cloud *= 0.80;
    // Directional density contrast approximates cloud lighting; not scattering.
    float edgeLight = clamp(0.55 + (mhCloudDensity(cloudPoint + sunDir.xz * 0.25) - density) * 3.5, 0.0, 1.0);
    vec3 shadowCloud = mix(vec3(0.018, 0.025, 0.045), vec3(0.32, 0.39, 0.51), day);
    vec3 litCloud = mix(vec3(0.075, 0.090, 0.14), vec3(0.90, 0.94, 1.0), day);
    litCloud = mix(litCloud, vec3(0.95, 0.61, 0.39), sunset * day * 0.55);
    vec3 cloudColor = mix(shadowCloud, litCloud, edgeLight);
    cloudColor = mix(cloudColor, vec3(0.25, 0.29, 0.35), rain * 0.65);
    color = mix(color, cloudColor, cloud);
''' + s[end:]
    p.write_text(s, encoding='utf-8')
    # Shared horizon fade uses the actual render distance instead of 96/240 constants.
    for name in ['gbuffers_terrain.fsh', 'gbuffers_terrain_cutout.fsh', 'gbuffers_terrain_solid.fsh']:
        p = dest / 'shaders' / name
        s = p.read_text(encoding='utf-8')
        s = s.replace('smoothstep(96.0, 240.0, length(vViewPos))', 'mhDistanceHaze(length(vViewPos))')
        s = s.replace('    fog *= 1.0 - rainStrength * 0.18;\n', '')
        s = s.replace(' * (1.0 - rainStrength * 0.18)', '')
        p.write_text(s, encoding='utf-8')
    p = dest / 'shaders/gbuffers_water.fsh'
    s = p.read_text(encoding='utf-8')
    s = s.replace('vec3 deepTint = vec3(0.016, 0.080, 0.105);', 'vec3 deepTint = vec3(0.022, 0.105, 0.135);')
    anchor = '    gl_FragData[0] = vec4(surfaceColor, alpha);'
    assert anchor in s
    s = s.replace(anchor, '''    // Fade water to the viewing sky, not the reflected sky. At far distance
    // alpha also converges to one so the unfogged bed cannot leak through.
    float atmosphere = isEyeInWater == 1 ? 0.0 : mhDistanceHaze(length(vViewPos));
    vec3 viewingSky = skyColorWorld(normalize(mat3(gbufferModelViewInverse) * incident));
    surfaceColor = mix(surfaceColor, viewingSky, atmosphere);
    alpha = mix(alpha, 1.0, atmosphere);
''' + anchor)
    p.write_text(s, encoding='utf-8')
    p = dest / 'shaders/shaders.properties'
    s = p.read_text(encoding='utf-8')
    p.write_text(s + '\n# Custom sky owns clouds; avoid duplicate vanilla silhouettes.\nclouds=off\n', encoding='utf-8')
    p = dest / 'shader-plan.json'
    plan = json.loads(p.read_text(encoding='utf-8'))
    plan['goal'] = 'Local horizon/cloud revision of GoldenHourReflectiveHorizon-checked. Continuous lower sky, matching render-distance haze on water/terrain, restrained sunset and directional 2D cloud contrast. Not untouched AI output.'
    plan['pipeline'].append('Local revision: shared mhDistanceHaze uses far on terrain/water; water RGB and alpha converge to viewing sky at far distance. Continuous lower sky replaces branch jump; vanilla clouds disabled for the custom 2D layer.')
    for feature in plan['features']:
        if feature['kind'] == 'sky':
            feature['limitations'] += ' Local revision changes horizon/cloud palette and shape; procedural 2D layer, not volumetric. Minecraft acceptance pending.'
    (dest / 'shader-plan.json').write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    (dest / 'README.md').write_text('''# GoldenHourReflectiveHorizon - horizon02

Local authored revision of the AI-generated checked pack; original retained as
golden-hour-01. Fixes a measured lower-sky branch discontinuity and adds matching
render-distance haze to terrain/water. Water RGB and alpha approach viewing sky
at the far boundary; underwater path bypasses the added atmosphere. Deep water
tint is slightly lifted. Reflection tracing, wave normals and material mapping
are retained. No new texture assets or material lighting algorithms.

Bounded dome cloud coordinates and directional density contrast replace flat
streaks; vanilla clouds are disabled to avoid duplicate silhouettes. Sun disc is
larger and sunset saturation restrained. Clouds remain 2D, not volumetric light
transport. Far haze hides the render edge; it does not render missing terrain.

Native tests use controlled synthetic inputs, not an Iris session. Check the
same ocean camera at sunset, then day/night/rain and different render distances.
Pan through the lower horizon, test shoreline reflections, ordinary glass and
underwater transitions. No Minecraft appearance or performance approval claimed.
No provider call or production deployment was used for this revision.
''', encoding='utf-8')
    print(dest)

if __name__ == '__main__': build()
