"""Revise only GoldenHour water's depth-dependent layer; preserve horizon02 sky."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]

BALANCE = '''#ifndef MH_WATER_BALANCE_GLSL
#define MH_WATER_BALANCE_GLSL
// Neutral Beer-style attenuation, not spectral transport or refraction.
// Return straight RGB for SRC_ALPHA blending into the premultiplied overlay.
vec4 mhWaterLayer(vec3 reflected, vec3 scatter, float pathLength, float nDotV) {
    float transmission = exp(-max(pathLength, 0.0) * 0.22);
    // Artist-selected base reflectance with Schlick angular response.
    float fresnel = 0.035 + 0.965 * pow(1.0 - clamp(nDotV, 0.0, 1.0), 5.0);
    float coverage = 1.0 - (1.0 - fresnel) * transmission;
    vec3 premultiplied = reflected * fresnel
        + scatter * (1.0 - fresnel) * (1.0 - transmission);
    return vec4(premultiplied / max(coverage, 0.00001), coverage);
}
#endif
'''

def build():
    dest = ROOT / 'shader-foundations/golden-hour-03'
    shutil.copytree(ROOT / 'shader-foundations/golden-hour-02', dest, dirs_exist_ok=True)
    (dest/'shaders/lib/water_balance.glsl').write_text(BALANCE, encoding='utf-8')
    p=dest/'shaders/gbuffers_water.fsh'
    s=p.read_text(encoding='utf-8')
    anchor='#include "/lib/lightmap.glsl"'
    assert anchor in s
    s=s.replace(anchor,anchor+'\n#include "/lib/water_balance.glsl"',1)
    s=s.replace('thickness = max(0.0, -bedPosition.z + vViewPos.z);',
                'thickness = max(0.0, length(bedPosition) - length(vViewPos));')
    start,end=s.index('    vec3 shallowTint ='),s.index('    vec3 sunView =')
    s=s[:start]+'''    vec3 shallowTint = vec3(0.14, 0.28, 0.23);
    vec3 deepTint = vec3(0.070, 0.20, 0.23);
    vec3 scatter = mix(shallowTint, deepTint, depthFactor);
    scatter *= lightmapColor * (0.18 + 0.60 * dayAmount());
    vec4 waterLayer = mhWaterLayer(reflection, scatter, thickness, nDotV);
    vec3 surfaceColor = waterLayer.rgb;
''' +s[end:]
    s=s.replace('    float alpha = mix(0.34, 0.60, depthFactor) * clamp(albedo.a, 0.55, 1.0);',
                '    float alpha = waterLayer.a;')
    p.write_text(s,encoding='utf-8')
    p=dest/'shader-plan.json';plan=json.loads(p.read_text(encoding='utf-8'))
    plan['goal']='Local water03 revision: preserve horizon02 sky/clouds and reflection trace, replace fixed water opacity with depth-dependent transmission and a coherent straight-alpha surface layer. Not untouched AI output.'
    plan['pipeline'].append('Water layer separates Fresnel reflection, depth-dependent neutral transmission and lit scatter. Divide covered radiance by coverage before SRC_ALPHA overlay blending so reflection is not attenuated twice. Preserve far-viewing-sky RGB/alpha convergence.')
    for feature in plan['features']:
        if feature['kind']=='reflections':
            feature['files'].append('shaders/lib/water_balance.glsl')
            feature['technique']+=' Local water03: optical-path attenuation and consistent straight-alpha reflection/scatter coverage.'
            feature['limitations']+=' Neutral scalar attenuation and artist-selected reflectance; not spectral transport, refraction or total internal reflection. Visual acceptance pending.'
    p.write_text(json.dumps(plan,indent=2)+'\n',encoding='utf-8')
    (dest/'README.md').write_text('''# GoldenHourReflectiveHorizon - water03

Separate local water revision of horizon02; keep the same resource packs.
Sky, clouds, sun, terrain light and horizon helpers are byte-for-byte unchanged.
Reflection trace and wave/normal code are retained.

Water uses a depth-dependent neutral transmission coefficient with a Schlick
angular response (artist-selected base reflectance 0.035). Coverage and straight
RGB are constructed so SRC_ALPHA blending preserves the reflection contribution
while attenuating the bed once. Shallows stay clearer; deep water obscures more
bed/kelp. Water scatter is lit by existing lightmap/day response, not self-emission.
Far-water viewing-sky fade is unchanged. Ordinary glass follows its previous path.

This is neutral scalar absorption, not spectral light transport, refraction,
total internal reflection or a full multilayer transparency solution. Bed depth
is a view-ray optical-path approximation; missing geometry uses a 14-unit fallback.
Underwater atmosphere bypass remains, but underwater optics are not physically
complete. No new textures, volumetric effects or performance approval claimed.

Test same sunset camera first, then a shallow shore versus deep water; inspect
near-object reflections from low and downward angles. Check day/night, underwater
entry, glass beside water and the far horizon. Native tests are synthetic and
compilation does not establish Minecraft appearance. Original packs retained.
No model call or production deployment was used for this authored revision.
''',encoding='utf-8')
    print(dest)

if __name__=='__main__': build()
