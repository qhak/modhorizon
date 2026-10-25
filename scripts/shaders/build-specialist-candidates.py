"""Build separate authored block/sky candidates; never change the water baseline."""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "shader-foundations/aurora-horizon"


def clone(name):
    destination = ROOT / "shader-foundations" / name
    shutil.copytree(BASE, destination, dirs_exist_ok=True)
    return destination


def change(root, name, old, new):
    path = root / name
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise ValueError(f"Missing pinned source anchor: {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


def blocks():
    root = clone("blocks-lab-01")
    change(root, "shaders/lib/geometry_vertex.glsl", "attribute vec4 mc_Entity;", """attribute vec4 mc_Entity;
attribute vec4 at_tangent;
varying vec4 vTerrainTangent;""")
    change(root, "shaders/lib/geometry_vertex.glsl", "vTerrainMaterial = mc_Entity.x;", """vTerrainMaterial = mc_Entity.x;
    vec3 viewTangent = gl_NormalMatrix * at_tangent.xyz;
    vTerrainTangent = vec4(mat3(gbufferModelViewInverse) * viewTangent, sign(at_tangent.w));""")
    change(root, "shaders/lib/geometry_fragment.glsl", "varying float vTerrainMaterial;", """varying float vTerrainMaterial;
varying vec4 vTerrainTangent;
uniform sampler2D normals;
uniform sampler2D specular;
#define LAB_NORMAL_STRENGTH 1.0 // [0.0 0.5 1.0 1.5]
bool labMaterial(float id) { return id > 12000.5 && id < 12003.5; }
vec3 labDetailNormal(vec3 n, vec4 encoded) {
    vec3 t = vTerrainTangent.xyz - n * dot(n, vTerrainTangent.xyz);
    if (length(t) < 0.001 || abs(vTerrainTangent.w) < 0.001) return n;
    t = normalize(t);
    // DirectX Y-minus convention, matching Iris' cross(tangent, normal) basis.
    vec3 b = cross(t, n) * sign(vTerrainTangent.w);
    vec2 xy = (encoded.rg * 2.0 - 1.0) * LAB_NORMAL_STRENGTH;
    xy *= min(1.0, 0.8 / max(length(xy), 0.001));
    vec3 mapped = normalize(t * xy.x + b * xy.y + n * sqrt(max(1.0 - dot(xy, xy), 0.0)));
    float fade = 1.0 - smoothstep(20.0, 48.0, length(vPlayer));
    return normalize(mix(n, mapped, fade));
}""")
    change(root, "shaders/lib/geometry_fragment.glsl",
           "vec3 detailNormal = terrainDetailNormal(n, texel.rgb, vTerrainMaterial);", """// Always sample before alpha discard. Exact atlas UV: no neighbouring sprites.
    vec4 normalSample = texture2D(normals, vUV);
    vec4 surfaceSample = texture2D(specular, vUV);
    vec3 detailNormal = labMaterial(vTerrainMaterial) ? labDetailNormal(n, normalSample)
        : terrainDetailNormal(n, texel.rgb, vTerrainMaterial);""")
    change(root, "shaders/lib/geometry_fragment.glsl",
           "vLM, ao, vTerrainMaterial);", "vLM, ao, vTerrainMaterial, surfaceSample);")
    change(root, "shaders/lib/lighting.glsl", "float roughness, float metallic) {",
           "float roughness, float metallic, float dielectricF0) {")
    change(root, "shaders/lib/lighting.glsl", "vec3 f0 = mix(vec3(0.04),", "vec3 f0 = mix(vec3(dielectricF0),")
    change(root, "shaders/lib/lighting.glsl", "float ao, float material) {", "float ao, float material, vec4 surfaceSample) {")
    change(root, "shaders/lib/lighting.glsl", "vec2 response = terrainMaterialResponse(material);", """vec2 response = terrainMaterialResponse(material);
    float dielectricF0 = 0.04;
    if (material > 12000.5 && material < 12003.5) {
        // GGX helper squares perceptual roughness internally. Only dielectric
        // fixtures are supported; this is not a complete LabPBR shader decoder.
        response = vec2(clamp(1.0 - surfaceSample.r, 0.18, 1.0), 0.0);
        dielectricF0 = clamp(surfaceSample.g, 0.02, 0.20);
    }""")
    change(root, "shaders/lib/lighting.glsl", "response.x, response.y) * incident", "response.x, response.y, dielectricF0) * incident")
    path = root / "shaders/block.properties"
    lines = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("block."):
            key, values = line.split("=", 1)
            values = " ".join(v for v in values.split() if v not in {"minecraft:sand", "minecraft:stone", "minecraft:oak_planks"})
            line = key + "=" + values
        lines.append(line)
    lines += ["block.12001=minecraft:sand", "block.12002=minecraft:stone", "block.12003=minecraft:oak_planks"]
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    path = root / "shaders/shaders.properties"
    text = path.read_text(encoding="utf-8").replace("screen=", "screen=LAB_NORMAL_STRENGTH ").replace("sliders=", "sliders=LAB_NORMAL_STRENGTH ")
    path.write_text(text, encoding="utf-8")
    plan = json.loads((root / "shader-plan.json").read_text(encoding="utf-8"))
    plan["goal"] = "Separate block material candidate: real texture detail plus normal and dielectric roughness response on sand, stone and oak planks. Aurora water is inherited unchanged."
    for feature in plan["features"]:
        if feature["name"] == "Terrain material highlights and inferred relief":
            feature["limitations"] = "Other material categories retain small colour-height approximations; the three mapped fixtures instead use companion normal/smoothness data. No geometric displacement. Close-up shimmer and material appearance need game tests."
    plan["features"].append({"name": "Three companion block materials", "kind": "other", "priority": 1,
        "status": "implemented", "technique": "Companion 512px albedo/_n/_s resource textures; matched tangent basis, reconstructed normal Z and dielectric smoothness/F0 decoding, material-ID gated before cutout discard.",
        "files": ["shaders/lib/geometry_vertex.glsl", "shaders/lib/geometry_fragment.glsl", "shaders/lib/lighting.glsl", "shaders/block.properties"],
        "limitations": "Needs BlocksLab-materials-01 resource pack. Three dielectric fixtures only, not full LabPBR compliance. No POM, geometric displacement or visual acceptance. All prior Aurora test evidence is historical."})
    (root / "shader-plan.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    (root / "README.md").write_text("""# BlocksLab candidate 01

Separate block-material experiment, derived from Aurora candidate03. Enable
BlocksLab-materials-01.zip in Resource Packs AND this ZIP in Iris Shader Packs.
The high-resolution albedo removes the coarse vanilla texture pattern on sand,
stone and oak planks; the companion normal/smoothness maps shape their lighting.
Other block textures remain vanilla. Block silhouettes remain cubes.

Only these three dielectric material fixtures decode maps. This is a LabPBR
subset, not general LabPBR compliance; no POM, true displacement, metal decoding,
porosity or global illumination. Normal detail fades with distance. Remove the
resource pack to compare the texture contribution; set LAB_NORMAL_STRENGTH=0
to compare surface normals. Test flat/rotated/mirrored faces in low sunlight,
torch/night light, underwater, and at distance for shimmer and atlas bleeding.

Water root files, the shared sky function and the non-terrain lightSurface path
are inherited unchanged from Aurora. This does not establish game equivalence
or visual acceptance. No paid generation was used. Select only ONE shader ZIP;
Minecraft does not stack BlocksLab, CleanSkyLab and Aurora shader packs.
""", encoding="utf-8")
    return root


CLEAN_SKY = """vec3 skyRadiance(vec3 direction) {
    vec3 rd = normalize(direction), sun = sunWorld();
    float day = daylight();
    float dusk = exp(-pow((sun.y - 0.015) / 0.23, 2.0));
    float above = smoothstep(-0.04, 0.75, rd.y);
    float toward = pow(max(dot(rd, sun), 0.0), 6.0);
    vec3 zenith = mix(vec3(0.004, 0.009, 0.026), vec3(0.13, 0.32, 0.61), day);
    vec3 horizon = mix(vec3(0.018, 0.027, 0.060), vec3(0.59, 0.74, 0.90), day);
    horizon = mix(horizon, vec3(0.90, 0.48, 0.28), dusk * (0.45 + 0.45 * toward));
    vec3 sky = mix(horizon, zenith, pow(above, 0.55));
    // Lower sky blends continuously into the same horizon, not a solid band.
    sky = mix(horizon * 0.65, sky, smoothstep(-0.65, 0.02, rd.y));
    sky += vec3(1.0, 0.68, 0.39) * toward * dusk * 0.30;
    float sunDot = dot(rd, sun);
    float disc = smoothstep(cos(0.010), cos(0.008), sunDot);
    sky += directColour() * disc * 7.0 * (1.0 - rainStrength * 0.85);
    float moon = smoothstep(cos(0.010), cos(0.008), dot(rd, -sun));
    sky += vec3(0.24, 0.31, 0.46) * moon * (1.0 - day);
    if (rd.y > 0.02) {
        float cloudHeight = max(60.0, 200.0 - cameraPosition.y);
        vec2 uv = (cameraPosition.xz + rd.xz * cloudHeight / max(rd.y, 0.02)) * 0.0022;
        uv += vec2(frameTimeCounter * 0.0015, 0.0);
        float coverage = smoothstep(0.53, 0.75, cloudNoise(uv));
        coverage *= smoothstep(0.02, 0.15, rd.y);
        float edge = clamp(0.55 + (cloudNoise(uv + sun.xz * 0.22) - cloudNoise(uv)) * 3.0, 0.0, 1.0);
        vec3 cloudDay = mix(vec3(0.67, 0.72, 0.80), vec3(1.0, 0.98, 0.93), edge);
        cloudDay = mix(cloudDay, vec3(1.0, 0.65, 0.43) * mix(0.65, 1.0, edge), dusk * 0.7);
        vec3 cloud = mix(vec3(0.014, 0.021, 0.040), cloudDay, day);
        sky = mix(sky, cloud, coverage * 0.80);
    }
    float grey = dot(sky, vec3(0.2126, 0.7152, 0.0722));
    return max(mix(sky, vec3(grey) * 0.78, rainStrength * 0.70), vec3(0.0));
}
"""


def sky():
    root = clone("clean-sky-lab-01")
    path = root / "shaders/lib/common.glsl"
    text = path.read_text(encoding="utf-8")
    start, end = text.index("vec3 skyRadiance("), text.index("vec3 viewPosition(")
    path.write_text(text[:start] + CLEAN_SKY + text[end:], encoding="utf-8")
    plan = json.loads((root / "shader-plan.json").read_text(encoding="utf-8"))
    plan["goal"] = "Separate clean-sky experiment: continuous blue/day and peach/sunset gradients, restrained discs and soft procedural clouds, inherited Aurora geometry/water pipeline."
    plan["referenceSummary"] = "Owner requests a separate clean-sky example. Aurora candidate03 is the accepted water reference only; this revised sky has no in-game acceptance yet."
    for feature in plan["features"]:
        if feature["kind"] == "sky":
            feature["name"] = "Clean sky and soft clouds"
            feature["limitations"] = "Soft 2D cloud plane, not volumetric clouds or scattering. No stars in candidate01. Above-cloud views, lower sky and night need visual evaluation."
    (root / "shader-plan.json").write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    (root / "README.md").write_text("""# CleanSkyLab candidate 01

Separate sky experiment derived from Aurora candidate03. The only rendering
source change is skyRadiance in common.glsl: softer day/sunset palette, continuous
lower horizon, restrained sun/moon discs and a soft two-dimensional cloud layer.
This is not volumetric scattering or volumetric clouds. No stars are provided in
this first sky candidate. Vanilla sky/sun/moon/stars/clouds stay disabled to avoid
duplicate layers. Camera above the analytic cloud layer is not fully modeled.

Aurora's water algorithm and geometry lighting are unchanged; reflections use
the same revised sky as the background, so their colour necessarily changes.
Test fixed camera at day/sunset/night, facing toward/away from the sun, above and
below the horizon, rain, water reflections and underwater. Look for horizon seams,
sun rectangles, cloud popping or a mismatched reflected sky. Visual acceptance
and FPS are pending; inherited historical test evidence does not validate this.

Use ONE shader pack at a time. This requires no BlocksLab resource pack and is
not stacked with BlocksLab or Aurora. AuroraHorizon-candidate-03 remains the
owner's accepted water baseline. No provider request was made for this candidate.
""", encoding="utf-8")
    return root


if __name__ == "__main__":
    print(blocks())
    print(sky())
