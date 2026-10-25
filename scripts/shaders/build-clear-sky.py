"""Sky-focused candidate05 over the owner's current BlocksLab04 materials."""
from pathlib import Path
import importlib.util
import json
import shutil

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("sky_example", Path(__file__).with_name("build-specialist-candidates.py"))
example = importlib.util.module_from_spec(spec)
spec.loader.exec_module(example)


def build():
    dest = ROOT / "shader-foundations/blocks-lab-05"
    shutil.copytree(ROOT / "shader-foundations/blocks-lab-04", dest, dirs_exist_ok=True)
    p = dest / "shaders/lib/common.glsl"
    source = p.read_text(encoding="utf-8")
    start, end = source.index("vec3 skyRadiance("), source.index("vec3 viewPosition(")
    sky = example.CLEAN_SKY.replace("vec3(0.13, 0.32, 0.61)", "vec3(0.045, 0.16, 0.42)")
    sky = sky.replace("vec3(0.59, 0.74, 0.90)", "vec3(0.32, 0.52, 0.76)")
    sky = sky.replace("vec3(0.67, 0.72, 0.80)", "vec3(0.38, 0.48, 0.62)")
    sky = sky.replace("vec3(1.0, 0.98, 0.93)", "vec3(0.95, 0.98, 1.04)")
    p.write_text(source[:start] + sky + source[end:], encoding="utf-8")
    # A background left by earlier rendering/clears must not replace our sky.
    # Composite fills behind translucent layers, not over their final colour.
    p = dest / "shaders/composite.fsh"
    source = p.read_text(encoding="utf-8")
    anchor = "    vec3 scene = texture2D(colortex0, vUV).rgb;"
    assert anchor in source
    source = source.replace(anchor, anchor + "\n    if (opaqueDepth >= 1.0) scene = sky;", 1)
    p.write_text(source, encoding="utf-8")
    # The pre-translucency scene snapshot gets the same background used by final
    # composition, so a water/glass lookup cannot inherit a cleared white sky.
    (dest / "shaders/deferred.fsh").write_text('''#version 120
/* DRAWBUFFERS:4 */
#include "/lib/common.glsl"
uniform sampler2D colortex0;
uniform sampler2D depthtex0;
varying vec2 vUV;
void main() {
    vec3 scene = texture2D(colortex0, vUV).rgb;
    if (texture2D(depthtex0, vUV).r >= 1.0) scene = skyRadiance(viewRayWorld(vUV));
    gl_FragData[0] = vec4(scene, 1.0);
}
''', encoding="utf-8")
    p = dest / "shader-plan.json"
    plan = json.loads(p.read_text(encoding="utf-8"))
    plan["goal"] = "Clear blue daytime sky, visible soft clouds and a continuous warm sunset over the unchanged candidate04 material and water algorithms. Explicit depth-empty sky composition and matching pre-translucency snapshot."
    plan["pipeline"].append("Deferred fills depth-empty opaque snapshot pixels with the shared sky; composite explicitly restores depth-empty background before translucent-layer mixing. Do not rely on begin colour surviving later scene rendering/clears.")
    for feature in plan["features"]:
        if feature["kind"] == "sky":
            feature["name"] = "Clear blue sky, warm sunset and visible soft clouds"
            feature["files"] = ["shaders/lib/common.glsl", "shaders/composite.fsh", "shaders/deferred.fsh"]
            feature["technique"] = "Shared continuous sky radiance with day/sunset/night palette, sun/moon discs and a soft procedural 2D cloud layer; explicitly fill depth==1 pixels in snapshot and composite before translucency."
            feature["limitations"] = "Not atmospheric scattering or volumetric clouds; no stars. Above-cloud views, distant edges, rain and Iris integration require game tests."
        if feature["name"] == "Expanded companion block materials":
            feature["limitations"] = "Uses unchanged BlocksLab-materials-04. Owner likes current grass/leaves direction; this is not general material approval. No new geometry, wind, POM or full LabPBR compliance."
    p.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab candidate05 - clear sky

Keep BlocksLab-materials-04 enabled. Only the shader ZIP changes. Preserves the
owner's current grass/leaves/material maps and non-sky lighting/exposure controls.
Water algorithms are unchanged; their reflected sky and fog colours now match
the revised background, so water's appearance can change with the sky.

The earlier pipeline depended on the early begin output remaining in scene colour.
This candidate explicitly fills depth==1 background in the opaque snapshot and
composite, before translucent-layer mixing. It does not paint over terrain or
glass/water. The shared helper provides a bluer day palette, visible soft 2D
clouds, restrained sun/moon discs and a continuous warm sunset/lower horizon.
Vanilla clouds/celestial layers stay disabled to avoid duplicate rendering.
No volumetric scattering/clouds or stars; camera above clouds is not fully modeled.

Test day/sunset/night/rain at fixed camera; pan up and down and around the sun.
Check horizon seams, cloud visibility, terrain edges and reflected sky/glass.
Do not lower global exposure to judge the sky: blocks/material controls are
unchanged. Native synthetic tests are not Iris or full-scene visual acceptance.
New appearance needs owner feedback. No provider request was used.

Primary pipeline/depth references checked 2026-10-24:
https://shaders.properties/current/reference/programs/overview/
https://shaders.properties/current/reference/programs/deferred/
https://shaders.properties/current/guides/your-first-shaderpack/3_deferred_lighting/
""", encoding="utf-8")
    print(dest)


if __name__ == "__main__": build()
