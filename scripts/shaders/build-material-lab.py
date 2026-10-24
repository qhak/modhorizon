"""Original periodic procedural materials; no downloads, game assets or API calls.

Requires numpy and Pillow. Albedo is deliberately unlit. Height, normal and
smoothness share the same source field, rather than inferring height from RGB.
This creates an experimental three-material resource pack, not photo scans.
"""
from pathlib import Path
from io import BytesIO
import json
import zipfile
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "material-foundations" / "blocks-lab-01"
SIZE = 512


def noise(u, v, frequency, seed):
    grid = np.random.default_rng(seed).random((frequency, frequency))
    x, y = np.mod(u, 1) * frequency, np.mod(v, 1) * frequency
    ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
    fx, fy = x - ix, y - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    return ((1 - fy) * ((1 - fx) * grid[iy % frequency, ix % frequency] +
                        fx * grid[iy % frequency, (ix + 1) % frequency]) +
            fy * ((1 - fx) * grid[(iy + 1) % frequency, ix % frequency] +
                  fx * grid[(iy + 1) % frequency, (ix + 1) % frequency]))


def material(name, u, v):
    low = noise(u, v, 8, 41)
    medium = noise(u, v, 32, 42)
    fine = noise(u, v, 128, 43)
    grain = noise(u, v, 256, 44)
    if name == "sand":
        height = 0.12 * low + 0.08 * medium + 0.30 * fine + 0.50 * grain
        quartz = noise(u, v, 256, 93)
        luminance = 0.92 + 0.08 * low + 0.06 * medium + 0.13 * (fine - .5) + .19 * (quartz - .5)
        colour = np.array([.77, .70, .56]) * luminance[..., None]
        colour += (grain - .5)[..., None] * np.array([.025, .024, .020])
        return colour, height, .00065, .10, 64
    if name == "stone":
        strata = np.sin(2 * np.pi * (v * 7 + .35 * low + .12 * medium))
        height = .40 * low + .30 * medium + .20 * fine + .10 * grain
        colour = np.array([.48, .475, .455]) * (.82 + .28 * low + .12 * medium + .05 * strata)[..., None]
        colour += (fine - .5)[..., None] * .085
        return colour, height, .003, .16, 40
    if name == "oak_planks":
        # Four narrow boards; the joint and grain continue through the tile edge.
        board_v = np.mod(v * 4, 1)
        joint = np.exp(-np.minimum(board_v, 1 - board_v) ** 2 / .00012)
        warp = .13 * low + .10 * medium
        rings = np.sin(2 * np.pi * (v * 65 + warp))
        fibre = noise(u * 4, v * 32, 16, 80)
        height = .35 + .18 * medium + .06 * rings + .04 * fibre - .28 * joint
        tint = .84 + .20 * low + .10 * medium + .07 * rings + .035 * (fibre - .5) - .29 * joint
        colour = np.array([.55, .37, .20]) * tint[..., None]
        return colour, height, .002, .25, 12
    raise ValueError(name)


def encode(name, size=SIZE):
    v, u = np.mgrid[0:size, 0:size].astype(float) / size
    colour, height, amplitude, smoothness, porosity = material(name, u, v)
    # One tile = one metre. Central periodic differences preserve border slopes.
    gx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * size * amplitude / 2
    gy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * size * amplitude / 2
    normals = np.stack((-gx, -gy, np.ones_like(gx)), axis=-1)
    normals /= np.linalg.norm(normals, axis=-1)[..., None]
    normal_map = np.empty((size, size, 4), dtype=np.uint8)
    normal_map[..., :2] = np.rint((normals[..., :2] * .5 + .5) * 255)
    normal_map[..., 2] = 255  # No baked material AO.
    normal_map[..., 3] = np.rint(np.clip(.35 + .5 * height, .01, 1) * 255)
    specular = np.zeros_like(normal_map)
    specular[..., 0] = round(smoothness * 255)
    specular[..., 1] = 10  # dielectric F0 ~0.04, not metal
    specular[..., 2] = porosity
    specular[..., 3] = 255  # LabPBR's non-emissive sentinel
    return np.rint(np.clip(colour, 0, 1) * 255).astype(np.uint8), normal_map, specular


def build():
    folder = DEST / "assets/minecraft/textures/block"
    folder.mkdir(parents=True, exist_ok=True)
    for name in ("sand", "stone", "oak_planks"):
        for suffix, data in zip(("", "_n", "_s"), encode(name)):
            Image.fromarray(data).save(folder / f"{name}{suffix}.png", optimize=True)
    (DEST / "pack.mcmeta").write_text(json.dumps({"pack": {
        "pack_format": 75, "min_format": [75, 0], "max_format": [75, 0],
        "description": "ModHorizon Blocks Lab 01 - sand, stone and oak materials (512px)"
    }}, indent=2) + "\n", encoding="utf-8")
    (DEST / "README.md").write_text("""# Blocks Lab 01 materials

Experimental original procedural sand, stone and oak-plank materials, each
512x512. No vanilla textures, external photographs or generated image API calls.
Albedo, tangent normal and normalized height share a periodic source field.
The _n and _s channels follow LabPBR 1.3; this pack provides no metallic materials,
emission or baked AO. Height is stored for inspection; the companion shader does
not implement parallax or displacement. Porosity is stored but not rendered.

Install this ZIP in resourcepacks and enable it ABOVE other texture packs.
Use BlocksLab-candidate-01 in the Iris shader menu for the normal/roughness test.
With AuroraHorizon-candidate-03 the new colour textures still work, but Aurora
does not decode these material maps. Only sand, stone and oak_planks change;
red sand, sandstone, other woods, items and all other blocks retain their assets.
This is a material prototype, not a full realistic texture pack or photo scan.

At fixed time and camera compare a sand beach, stone wall and oak-plank wall:
first no resource pack, then this resource pack, then the companion shader.
Check one-block closeups, large tiled surfaces, rotated faces, shadows, torch/night
light, underwater sand and texture-pack removal. Look for visible repeat seams,
incorrect tangent handedness, glitter at distance and shiny/plastic sand.
The block silhouettes remain cubes. Visual acceptance and performance are pending.

Rebuild with scripts/shaders/build-material-lab.py (numpy + Pillow).
Standards checked 2026-10-24:
https://shaderlabs.org/wiki/LabPBR_Material_Standard
https://shaders.properties/current/how-to/pbr_standards/
""", encoding="utf-8")
    print(f"Built nine PNGs in {DEST}")
    archive = BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as output:
        for path in sorted(DEST.rglob("*")):
            if path.is_symlink():
                raise ValueError("No symlinks in material source")
            if path.is_file():
                info = zipfile.ZipInfo(path.relative_to(DEST).as_posix(), (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                output.writestr(info, path.read_bytes())
    target = ROOT.parent / "outputs/BlocksLab-materials-01.zip"
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.read_bytes() != archive.getvalue():
        raise ValueError("A different material candidate exists; use a new version")
    target.write_bytes(archive.getvalue())
    print(f"Packaged {target}")


if __name__ == "__main__":
    build()
