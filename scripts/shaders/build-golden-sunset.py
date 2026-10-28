"""Reproduce sunset04 from retained water03 without a provider call."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]

def replace(source, old, new):
    assert source.count(old) == 1, old
    return source.replace(old, new, 1)

def build():
    dest = ROOT / 'shader-foundations/golden-hour-04'
    shutil.copytree(ROOT / 'shader-foundations/golden-hour-03', dest, dirs_exist_ok=True)
    p = dest/'shaders/lib/sky_common.glsl'
    s = p.read_text(encoding='utf-8')
    s = replace(s, '// Continuous horizon fade', '''// Twilight persists after the daytime illumination has started fading.
float mhSunsetLight() {
    return sunsetAmount() * smoothstep(-0.18, -0.025, solarElevation());
}
// Continuous horizon fade''')
    s = replace(s, '    float sunset = sunsetAmount();', '    float sunset = mhSunsetLight();')
    start, end = s.index('    float towardSun ='), s.index('    vec3 sunDir =', s.index('    float towardSun ='))
    s = s[:start] + '''    float towardSun = pow(max(dot(dir, worldSunDirection()), 0.0), 4.0);
    float warmBand = sunset * exp(-pow(h / 0.34, 2.0));
    vec3 sunsetHorizon = mix(vec3(0.76, 0.30, 0.23), vec3(1.16, 0.64, 0.29), towardSun);
    color = mix(color, sunsetHorizon, warmBand * (0.38 + towardSun * 0.42));
    vec3 lowerHorizon = mix(horizon, sunsetHorizon, sunset * (0.38 + towardSun * 0.42));
    vec3 lower = mix(upper * 0.40, lowerHorizon, smoothstep(-0.75, 0.0, h));
    color = mix(lower, color, smoothstep(-0.12, 0.04, h));
''' + s[end:]
    s = replace(s, '    color += sunTint * broadGlow * day;', '''    color += sunTint * broadGlow * day;
    // Local forward scattering glow; keep the upper/anti-solar sky cool.
    color += vec3(1.0, 0.53, 0.20) * sunset
        * (pow(sunDot, 12.0) * 0.30 + pow(sunDot, 80.0) * 0.46);''')
    s = replace(s, 'float disc = smoothstep(cos(0.024), cos(0.020), sunDot) * day;', 'float disc = smoothstep(cos(0.024), cos(0.020), sunDot) * max(day, sunset * 0.85);')
    s = replace(s, '    cloud *= 0.80;', '    cloud *= 0.80;')
    s = replace(s, '    litCloud = mix(litCloud, vec3(0.95, 0.61, 0.39), sunset * day * 0.55);', '''    shadowCloud = mix(shadowCloud, vec3(0.30, 0.18, 0.25), sunset * 0.48);
    litCloud = mix(litCloud, vec3(1.16, 0.63, 0.34), sunset * 0.88);''')
    s = replace(s, '    vec3 cloudColor = mix(shadowCloud, litCloud, edgeLight);', '''    vec3 cloudColor = mix(shadowCloud, litCloud, edgeLight);
    float silverEdge = (1.0 - smoothstep(threshold + 0.035, threshold + 0.15, density))
        * pow(max(dot(dir, sunDir), 0.0), 3.0);
    cloudColor += vec3(1.0, 0.52, 0.22) * silverEdge * sunset * 0.65;''')
    p.write_text(s, encoding='utf-8')
    p = dest/'shaders/lib/terrain_lighting.glsl'
    s = p.read_text(encoding='utf-8')
    s = replace(s, '    ambient *= mix(0.075, 1.0, pow(skyExposure, 1.35)) * hemisphere;', '''    // Twilight fill remains tied to sky exposure, preserving dark interiors.
    ambient += vec3(0.15, 0.17, 0.22) * mhSunsetLight();
    ambient *= mix(0.075, 1.0, pow(skyExposure, 1.35)) * hemisphere;''')
    s = replace(s, 'vec3 direct = directTint * sunAmount * 1.32;', 'vec3 direct = directTint * sunAmount * (1.32 + mhSunsetLight() * 0.65);')
    p.write_text(s, encoding='utf-8')
    p = dest/'shaders/gbuffers_water.fsh'
    s = p.read_text(encoding='utf-8')
    s = replace(s, 'scatter *= lightmapColor * (0.18 + 0.60 * dayAmount());', 'scatter *= lightmapColor * (0.18 + 0.60 * dayAmount() + 0.22 * mhSunsetLight());')
    s = replace(s, 'float sunSpec = pow(max(dot(normalView, halfVector), 0.0), 88.0) * dayAmount() * (1.0 - rainStrength * 0.8);', '''float specAlignment = max(dot(normalView, halfVector), 0.0);
    float sunSpec = (pow(specAlignment, 88.0) * dayAmount()
        + pow(specAlignment, 160.0) * mhSunsetLight() * 1.1) * (1.0 - rainStrength * 0.8);''')
    p.write_text(s, encoding='utf-8')
    p = dest/'shader-plan.json'
    plan = json.loads(p.read_text(encoding='utf-8'))
    plan['goal'] = 'Authored sunset04: directional golden twilight, warm cloud edges, readable sky-exposed terrain and stronger water highlights. Retains water03 optical coverage, waves and reflection trace.'
    plan['pipeline'].append('Sunset response persists independently of day fade; shared sky radiance feeds water reflection. Sky-exposure-gated twilight fill preserves dark interiors. No global exposure increase.')
    p.write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    (dest/'README.md').write_text('''# GoldenHourReflectiveHorizon - sunset04

Authored revision of water03. Golden directional twilight, peach cloud edges,
stronger solar water highlight and cool ambient fill on sky-exposed terrain.
Daytime and deep night retain the previous lighting response. Rain reduces
sunset intensity. No global exposure increase. The sky and reflection fallback
share the same radiance function. Wave normals, reflection trace, water coverage,
far fade, glass path and material textures are retained.

Cloud lighting and glow are artistic approximations, not volumetric transport.
Native compilation and synthetic GPU checks cannot establish Minecraft visuals.
Test the same camera/time/weather/resource packs as water03, then midday,
night, rain, underwater, glass and a dark interior. Original packs retained.
No provider call or deployment used. Minecraft visual acceptance pending.
''', encoding='utf-8')
    print(dest)

if __name__ == '__main__': build()
