"""Reproduce the authored OreGlow candidate from retained sunset04.

Requires a companion resource pack carrying LabPBR alpha emission masks.
No provider call, client launch or deployment.
"""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
MINERALS = ['coal', 'iron', 'copper', 'gold', 'redstone', 'emerald', 'lapis', 'diamond']
ORES = [name+'_ore' for name in MINERALS] + ['deepslate_'+name+'_ore' for name in MINERALS] + ['nether_gold_ore', 'nether_quartz_ore']

EMISSION = '''#ifndef MH_ORE_EMISSION_GLSL
#define MH_ORE_EMISSION_GLSL
uniform sampler2D specular;
#define ORE_GLOW_STRENGTH 1.2 // [0.6 0.9 1.2 1.5]
float mhOreEmission(vec2 uv, float materialId) {
    // Exact block mapping bounds: unrelated blocks cannot become emissive.
    if (materialId < 20000.5 || materialId > 20018.5) return 0.0;
    float encoded = texture2D(specular, uv).a;
    // LabPBR alpha 254 is maximum emission; 255 is the no-emission sentinel.
    if (encoded >= 254.5 / 255.0) return 0.0;
    return clamp(encoded * (255.0 / 254.0), 0.0, 1.0);
}
float mhOreVisibility(float fog, float distanceToEye) {
    // Self brightness does not cancel far haze or underwater attenuation.
    float medium = isEyeInWater == 1 ? exp(-max(distanceToEye, 0.0) * 0.025) : 1.0;
    return (1.0 - clamp(fog, 0.0, 1.0)) * medium;
}
#endif
'''

BLOOM = '''#ifndef MH_ORE_BLOOM_GLSL
#define MH_ORE_BLOOM_GLSL
uniform sampler2D colortex6;
uniform sampler2D colortex1;
uniform sampler2D depthtex0;
uniform sampler2D depthtex1;
uniform float viewWidth;
uniform float viewHeight;
#define ORE_HALO_STRENGTH 0.32 // [0.0 0.16 0.32 0.48]
vec3 mhOreHaloTap(vec2 uv, float receiverDepth) {
    if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return vec3(0.0);
    float sourceDepth = texture2D(depthtex1, uv).r;
    if (sourceDepth >= 0.999999 || sourceDepth > receiverDepth + 0.00001) return vec3(0.0);
    // A nearer solid/translucent overlay must not reveal hidden ore emission.
    float overlay = clamp(texture2D(colortex1, uv).a, 0.0, 1.0);
    return texture2D(colortex6, uv).rgb * (1.0 - overlay);
}
vec3 mhOreHalo(vec2 uv) {
    vec2 pixel = 1.0 / max(vec2(viewWidth, viewHeight), vec2(1.0));
    float receiverDepth = min(texture2D(depthtex0, uv).r, texture2D(depthtex1, uv).r);
    vec3 halo = vec3(0.0);
    for (int radiusIndex = 0; radiusIndex < 3; ++radiusIndex) {
        float radius = 1.0 + float(radiusIndex) * 2.0;
        float weight = 1.0 / (1.0 + float(radiusIndex));
        halo += mhOreHaloTap(uv + vec2(pixel.x * radius, 0.0), receiverDepth) * weight;
        halo += mhOreHaloTap(uv - vec2(pixel.x * radius, 0.0), receiverDepth) * weight;
        halo += mhOreHaloTap(uv + vec2(0.0, pixel.y * radius), receiverDepth) * weight;
        halo += mhOreHaloTap(uv - vec2(0.0, pixel.y * radius), receiverDepth) * weight;
    }
    float receiverOverlay = clamp(texture2D(colortex1, uv).a, 0.0, 1.0);
    return halo * (ORE_HALO_STRENGTH / 7.333333) * (1.0 - receiverOverlay);
}
#endif
'''

def build():
    dest = ROOT/'shader-foundations/ore-glow-01'
    shutil.copytree(ROOT/'shader-foundations/golden-hour-04', dest, dirs_exist_ok=True)
    shader = dest/'shaders'
    (shader/'lib/ore_emission.glsl').write_text(EMISSION, encoding='utf-8')
    (shader/'lib/ore_bloom.glsl').write_text(BLOOM, encoding='utf-8')
    p = shader/'block.properties'
    p.write_text(p.read_text(encoding='utf-8')+'\n# Emission is restricted to these visible ore materials.\n'+''.join(f'block.{20001+i}=minecraft:{name}\n' for i,name in enumerate(ORES)), encoding='utf-8')
    for name in ['gbuffers_terrain.fsh', 'gbuffers_terrain_solid.fsh', 'gbuffers_terrain_cutout.fsh']:
        p = shader/name
        s = p.read_text(encoding='utf-8').replace('/* DRAWBUFFERS:0 */', '''/* DRAWBUFFERS:06 */
const bool colortex6Clear = true;
const vec4 colortex6ClearColor = vec4(0.0, 0.0, 0.0, 0.0);
''')
        s = s.replace('#include "/lib/terrain_lighting.glsl"', '#include "/lib/terrain_lighting.glsl"\n#include "/lib/ore_emission.glsl"')
        marker = '    vec3 worldRay ='
        assert marker in s
        s = s.replace(marker, '''    float emission = mhOreEmission(vUV, vMaterial);
    vec3 mineralEmission = albedo.rgb * emission * ORE_GLOW_STRENGTH;
    // Only mineral pixels get a lighting floor; host stone remains normally lit.
    float underwater = isEyeInWater == 1 ? exp(-length(vViewPos) * 0.025) : 1.0;
    lit = max(lit, mineralEmission * underwater);
''' + marker)
        marker = '    gl_FragData[0] ='
        assert marker in s
        s = s.replace(marker, '''    gl_FragData[1] = vec4(mineralEmission * mhOreVisibility(fog, length(vViewPos)), 1.0);
''' + marker)
        p.write_text(s, encoding='utf-8')
    # Every other opaque color pass clears emission where its geometry wins depth.
    # Shadow is a separate depth pass, and translucent passes keep their layer1 path.
    for p in shader.glob('gbuffers_*.fsh'):
        s = p.read_text(encoding='utf-8')
        if '/* DRAWBUFFERS:0 */' not in s:
            continue
        s = s.replace('/* DRAWBUFFERS:0 */', '/* DRAWBUFFERS:06 */')
        lines = s.splitlines()
        for i in range(len(lines)-1, -1, -1):
            if 'gl_FragData[0] =' in lines[i]:
                lines.insert(i+1, '    gl_FragData[1] = vec4(0.0);')
        p.write_text('\n'.join(lines)+'\n', encoding='utf-8')
    p = shader/'lib/lit_fragment.glsl'
    s = p.read_text(encoding='utf-8').replace('    gl_FragData[0] =', '    gl_FragData[1] = vec4(0.0);\n    gl_FragData[0] =')
    p.write_text(s, encoding='utf-8')
    p = shader/'composite.fsh'
    s = p.read_text(encoding='utf-8')
    s = s.replace('uniform sampler2D colortex1;\nuniform sampler2D depthtex1;', '#include "/lib/ore_bloom.glsl"')
    s = s.replace('    gl_FragData[0] = vec4(color, 1.0);', '    color += mhOreHalo(vUV);\n    gl_FragData[0] = vec4(color, 1.0);')
    p.write_text(s, encoding='utf-8')
    p = shader/'shaders.properties'
    s = p.read_text(encoding='utf-8')+'\n# Both settings operate on mapped ore material pixels only.\nscreen=ORE_GLOW_STRENGTH ORE_HALO_STRENGTH\nsliders=ORE_GLOW_STRENGTH ORE_HALO_STRENGTH\n'
    p.write_text(s, encoding='utf-8')
    p = dest/'shader-plan.json'
    plan = json.loads(p.read_text(encoding='utf-8'))
    plan['goal'] = 'Authored OreGlow01: visible ore mineral patches retain self-brightness in caves, with a small depth-aware screen halo. Requires companion LabPBR alpha masks; preserve sunset04 water and sky.'
    plan['referenceSummary'] = 'Owner screenshot shows pale high-contrast iron ore in a normally lit stone tunnel. Request now adds a shader for self-bright mineral patches and a soft halo in dark caves and underwater; not hidden-ore visibility or dynamic block light.'
    plan['pipeline'] = [line.replace('No separate tone-map or bloom pass is applied.', 'Composite adds only a bounded ore-emission halo from separate colortex6; no global exposure change.') for line in plan['pipeline']]
    plan['pipeline'].append('Mapped ore terrain samples companion specular alpha: 0 is no emission, 254/255 is maximum, alpha1 is ignored. Self-bright mineral floor and cleared separate emission attachment6 precede far-haze attenuation.')
    plan['pipeline'].append('All opaque passes overwrite emission at winning depth. Composite reads attachment6 using bounded 12-tap screen halo, depth ordering and overlay-alpha suppression. Water and scene-snapshot paths remain unchanged.')
    plan['features'] = [f for f in plan['features'] if f['kind'] != 'bloom']
    for feature in plan['features']:
        feature['limitations'] = feature['limitations'].replace('No bloom.', 'Sky highlights do not receive a global bloom effect.')
        feature['limitations'] = feature['limitations'].replace('Normal/specular atlas integration is not included.', 'Normal/material lighting is not added; only the companion ore emission alpha is sampled.')
        if feature['name'] == 'Volumetric sun shafts and bloom':
            feature['name'] = 'Volumetric sun shafts'
            feature['technique'] = 'Not implemented; warm sky glow and distance haze are not occlusion-aware shafts. A separate bounded ore halo is described below.'
    plan['features'].extend([
        {'name': 'Mapped ore mineral self brightness', 'kind': 'lighting', 'priority': 1, 'status': 'approximation', 'technique': 'Read specular-atlas alpha emission only for block IDs 20001-20018; add an albedo-scaled lighting floor and write a distinct fog-attenuated emission mask. Ignore alpha255 and all non-ore materials.', 'files': ['shaders/lib/ore_emission.glsl', 'shaders/gbuffers_terrain.fsh', 'shaders/gbuffers_terrain_solid.fsh', 'shaders/gbuffers_terrain_cutout.fsh'], 'limitations': 'Requires OreGlow companion resource pack. Only LabPBR emission alpha is consumed; not a full LabPBR material implementation. Self-brightness does not cast light onto nearby blocks. Iris/OptiFine atlas binding and underwater appearance need game testing.'},
        {'name': 'Depth-aware ore screen halo', 'kind': 'bloom', 'priority': 2, 'status': 'approximation', 'technique': 'Collect 12 bounded taps of cleared emission attachment6 in composite. Reject clear-depth, farther-than-receiver taps and opaque translucent-overlay coverage; add a small glow only around visible ore mask pixels.', 'files': ['shaders/composite.fsh', 'shaders/lib/ore_bloom.glsl', 'shaders/lib/lit_fragment.glsl'], 'limitations': 'Screen-space artistic halo, not physically based bloom, hidden-geometry detection or dynamic lighting. Depth tolerance and transparent-water absorption need real-scene evaluation. Existing opaque geometry clears the mask; no off-screen ore is reconstructed.'},
    ])
    p.write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    (dest/'README.md').write_text('''# OreGlow - test02

Authored candidate copied from the retained sunset04 shader. Enable the matching
OreGlowMasks resource pack ABOVE ClearOres, then select this shader in Iris or
OptiFine. Only mineral pixels of the 18 mapped ores use companion specular alpha
for self brightness. Without those maps, ores should retain ordinary lighting.
Stone stays normally shaded. Existing sky, water and reflection algorithms remain.

Small screen-space glow is separate from the self-bright mineral floor. It uses a
cleared emission attachment, opaque depth ordering and overlay-alpha suppression.
This does not reveal ores behind stone or emit dynamic light onto nearby blocks.
Underwater self brightness is attenuated with distance and existing water layers.
The shader reads LabPBR emission alpha only; full LabPBR material support is not
claimed. Default no-map alpha255 is ignored; alpha254 means maximum emission.

Test the iron tunnel first at low light, then diamond/redstone, deepslate and Nether
ores. Check a stone face covering ore, held opaque items, water surface/underwater,
day/night/rain and the far horizon. Use shader settings to reduce glow strength or
halo. Companion PNG/GLSL and synthetic GPU tests do not prove actual Iris runtime
appearance. Game visual acceptance and FPS remain pending. No provider call or
deployment was used. Prior shader and resource packs are retained separately.
''', encoding='utf-8')
    print(dest)

if __name__ == '__main__': build()
