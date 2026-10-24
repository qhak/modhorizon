"""Candidate06: bounded cloud projection, readable sun and reduced distance haze."""
from pathlib import Path
import json
import shutil
ROOT = Path(__file__).resolve().parents[2]

def build():
    source = ROOT / 'shader-foundations/blocks-lab-05'
    dest = ROOT / 'shader-foundations/blocks-lab-06'
    shutil.copytree(source, dest, dirs_exist_ok=True)
    p = dest / 'shaders/lib/common.glsl'
    s = p.read_text(encoding='utf-8')
    s = s.replace('vec3(0.32, 0.52, 0.76)', 'vec3(0.22, 0.39, 0.65)')
    s = s.replace('vec3(0.90, 0.48, 0.28)', 'vec3(0.68, 0.29, 0.12)')
    s = s.replace('dusk * (0.45 + 0.45 * toward)', 'dusk * (0.30 + 0.55 * toward)')
    s = s.replace('toward * dusk * 0.30', 'toward * dusk * 0.12')
    s = s.replace('smoothstep(cos(0.010), cos(0.008), sunDot)', 'smoothstep(cos(0.026), cos(0.023), sunDot)')
    start, end = s.index('    if (rd.y > 0.02)'), s.index('    float grey =')
    s = s[:start] + """    // Bounded angular dome: unlike ray/height projection this has no 1/y
    // singularity at the horizon. Stylized 2D clouds, not volumetric cumulus.
    if (rd.y > 0.0) {
        vec2 uv = rd.xz / (0.65 + rd.y) * 4.2;
        uv += cameraPosition.xz * 0.00012 + vec2(frameTimeCounter * 0.002, 0.0);
        vec2 warp = vec2(noise2(uv * 0.65 + 9.0), noise2(uv * 0.65 - 13.0));
        vec2 shapeUV = uv + (warp - 0.5) * 0.7;
        float mass = cloudNoise(shapeUV);
        float coverage = smoothstep(0.48, 0.65, mass);
        coverage *= smoothstep(0.015, 0.12, rd.y);
        float edge = clamp(0.55 + (cloudNoise(shapeUV + sun.xz * 0.28) - mass) * 2.5, 0.0, 1.0);
        vec3 cloudDay = mix(vec3(0.26, 0.34, 0.46), vec3(0.85, 0.91, 1.0), edge);
        cloudDay = mix(cloudDay, vec3(0.88, 0.43, 0.22) * mix(0.55, 1.0, edge), dusk * 0.65);
        vec3 cloud = mix(vec3(0.010, 0.016, 0.030), cloudDay, day);
        sky = mix(sky, cloud, coverage * 0.88);
    }
""" + s[end:]
    p.write_text(s, encoding='utf-8')
    p = dest / 'shaders/composite.fsh'
    s = p.read_text(encoding='utf-8').replace('FOG_DENSITY * (1.0 + goldenHour() * 0.55 + rainStrength * 2.0)', 'FOG_DENSITY * 0.65 * (1.0 + goldenHour() * 0.15 + rainStrength * 2.0)')
    p.write_text(s, encoding='utf-8')
    p = dest / 'shader-plan.json'
    plan = json.loads(p.read_text(encoding='utf-8'))
    plan['goal'] = 'Improve candidate05 sky shapes and readability: bounded angular cloud clusters, larger stylized sun disc and less sunset haze. Keep materials04, block lighting and water algorithms.'
    for feature in plan['features']:
        if feature['kind'] == 'sky':
            feature['name'] = 'Clustered 2D clouds and readable stylized sun'
            feature['technique'] = 'Shared depth-empty sky ownership with bounded angular dome cloud coordinates, warped noise clusters and 0.026-radian sun radius; lower horizon radiance and reduced distance haze.'
            feature['limitations'] = 'Stylized 2D dome, not atmospheric scattering or volumetric clouds; no stars or physical solar size. Clouds have limited parallax. Minecraft acceptance pending.'
    p.write_text(json.dumps(plan, indent=2)+'\n', encoding='utf-8')
    (dest / 'README.md').write_text("""# BlocksLab candidate06 - sky shapes

Keep BlocksLab-materials-04 enabled; select this shader ZIP alone.
Candidate05 screenshot showed streaky clouds, tiny sun and pale sunset horizon.
Candidate06 uses bounded angular dome coordinates for clustered 2D clouds,
a larger stylized sun disc, darker horizon radiance and 35% lower base distance
fog with less sunset amplification. Far render-distance fade and underwater fog
are unchanged. Blocks, material assets, lighting and water algorithms are retained;
water reflects the revised sky and participates in the reduced atmosphere.

Clouds are a stylized 2D dome with limited parallax, not volumetric clouds or
physical scattering. No stars; new appearance needs Minecraft feedback.
Keep shader clouds enabled; vanilla clouds stay disabled to prevent overlap.
Test fixed-camera noon, sunset, night and rain; pan around the sun/horizon and
look up at cloud shapes. Check cloud motion, terrain silhouettes and reflected sky.
Native compile/tests and synthetic preview do not establish Iris visual acceptance.
No paid generation request or deployment.
""", encoding='utf-8')
    print(dest)

if __name__ == '__main__': build()
