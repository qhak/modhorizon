"""Candidate03: periodic irregular bark and biome-tinted cutout foliage.

Original procedural material fields, not photographs. No provider/network calls.
Only bark and three leaf sprites change; earlier non-bark materials are copied.
"""
from pathlib import Path
from io import BytesIO
import importlib.util
import json
import shutil
import zipfile
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("earth_materials", Path(__file__).with_name("build-material-expansion.py"))
earth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(earth)
noise, smooth = earth.noise, earth.smooth
NAMES = ("oak_log", "spruce_log", "birch_log", "oak_leaves", "spruce_leaves", "birch_leaves")


def torus(x, centre):
    return np.mod(x - centre + .5, 1) - .5


def bark(name, u, v):
    seed = 831 if name == "oak_log" else 947 if name == "spruce_log" else 1031
    low, medium, fine = noise(u, v, 7, seed), noise(u * 2, v, 24, seed + 1), noise(u, v, 128, seed + 2)
    if name == "birch_log":
        marks = np.zeros_like(u)
        rng = np.random.default_rng(seed)
        for _ in range(42):
            cx, cy = rng.random(2)
            dx, dy = torus(u, cx), torus(v, cy)
            width, thickness = rng.uniform(.014, .075), rng.uniform(.003, .012)
            shape = (dx / width) ** 2 + ((dy + .035 * dx) / thickness) ** 2
            scar = (1 - smooth(.60, 1.15, shape)) * (.55 + .45 * medium)
            marks = np.maximum(marks, scar)
        colour = np.array([.79, .765, .69]) * (.95 + .09 * low + .035 * (fine - .5))[..., None]
        colour *= (1 - .76 * marks)[..., None]
        height = .44 + .13 * medium + .06 * fine - .15 * marks
        return colour, height, .0025, .12, 20
    # Anisotropic jittered cells produce broken long plates, not fixed sine bars.
    plates, pigment, distance = earth.pebbles(u * 3, v, 11 if name == "oak_log" else 15)
    breaks = noise(u * 2, v * 3, 12, seed + 3)
    ridge = plates * (.48 + .52 * smooth(.15, .85, breaks))
    height = .20 + .38 * ridge + .20 * medium + .08 * fine
    knot_pattern = np.zeros_like(u)
    stain = np.zeros_like(u)
    rng = np.random.default_rng(seed + 4)
    for _ in range(4):
        cx, cy = rng.random(2)
        dx, dy = torus(u, cx) / rng.uniform(.045, .085), torus(v, cy) / rng.uniform(.07, .14)
        radius = np.sqrt(dx * dx + dy * dy + 1e-6)
        envelope = np.exp(-radius * radius * 1.7)
        knot_pattern += np.sin(radius * 17 + .6 * medium) * envelope
        stain += np.exp(-radius * radius * 6)
    height += .10 * knot_pattern - .08 * stain
    base_colour = np.array([.43, .335, .24] if name == "oak_log" else [.34, .28, .215])
    tint = .76 + .21 * low + .19 * medium + .14 * pigment + .055 * knot_pattern - .16 * stain
    colour = base_colour * tint[..., None]
    colour += (fine - .5)[..., None] * .045
    return colour, height, .004, .11, 20


def foliage(name, u, v):
    species = name.split("_")[0]
    rng = np.random.default_rng({"oak": 1201, "spruce": 1301, "birch": 1401}[species])
    fine = noise(u, v, 128, 1551)
    grey = .79 + .05 * (fine - .5)
    height = np.full_like(u, .45)
    alpha = np.zeros_like(u)
    count = {"oak": 68, "spruce": 260, "birch": 105}[species]
    for _ in range(count):
        cx, cy = rng.random(2)
        angle = rng.uniform(0, 2 * np.pi)
        length = rng.uniform(.085, .13) if species == "oak" else rng.uniform(.07, .12) if species == "spruce" else rng.uniform(.055, .09)
        width = rng.uniform(.035, .065) if species == "oak" else rng.uniform(.007, .014) if species == "spruce" else rng.uniform(.02, .035)
        dx, dy = torus(u, cx), torus(v, cy)
        a = (dx * np.cos(angle) + dy * np.sin(angle)) / length
        b = (-dx * np.sin(angle) + dy * np.cos(angle)) / width
        theta = np.arctan2(b, a)
        lobes = 1 + (.11 if species == "oak" else .035) * np.cos(theta * (6 if species == "oak" else 12))
        radius = np.sqrt(a * a + b * b) / lobes
        coverage = 1 - smooth(.94, 1.02, radius)
        centre_vein = np.exp(-b * b * 500) * (1 - smooth(.80, 1., np.abs(a)))
        side_vein = np.exp(-np.sin((a + np.abs(b) * .55) * 22) ** 2 * 45) * (1 - smooth(.65, 1, radius))
        tone = rng.uniform(.65, .96) + .045 * (fine - .5) - .045 * centre_vein - .025 * side_vein
        leaf_height = .47 + .08 * np.maximum(1 - radius * radius, 0) + .015 * centre_vein
        grey = grey * (1 - coverage) + tone * coverage
        height = height * (1 - coverage) + leaf_height * coverage
        alpha = 1 - (1 - alpha) * (1 - coverage)
    # Store neutral albedo; vanilla biome/species tint remains authoritative.
    colour = np.repeat(grey[..., None], 3, axis=-1)
    return colour, height, .0006, .09, 45, alpha


def material(name, u, v):
    return foliage(name, u, v)[:5] if name.endswith("_leaves") else bark(name, u, v)


def encode(name, size=512):
    v, u = np.mgrid[0:size, 0:size].astype(float) / size
    field = foliage(name, u, v) if name.endswith("_leaves") else bark(name, u, v)
    colour, h, amp, gloss, porosity = field[:5]
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * size * amp / 2
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * size * amp / 2
    n = np.stack((-dx, -dy, np.ones_like(h)), axis=-1)
    n /= np.linalg.norm(n, axis=-1)[..., None]
    normal = np.empty((size, size, 4), dtype=np.uint8)
    normal[..., :2] = np.rint((n[..., :2] * .5 + .5) * 255)
    normal[..., 2] = 255
    normal[..., 3] = np.rint(np.clip(.35 + .5 * h, .01, 1) * 255)
    surface = np.zeros_like(normal)
    surface[..., 0], surface[..., 1], surface[..., 2], surface[..., 3] = round(gloss * 255), 10, porosity, 255
    albedo = np.rint(np.clip(colour, 0, 1) * 255).astype(np.uint8)
    if name.endswith("_leaves"):
        alpha = np.rint(field[5] * 255).astype(np.uint8)
        albedo = np.concatenate((albedo, alpha[..., None]), axis=-1)
    return albedo, normal, surface


def shader():
    dest = ROOT / "shader-foundations/blocks-lab-03"
    shutil.copytree(ROOT / "shader-foundations/blocks-lab-02", dest, dirs_exist_ok=True)
    for name in ("geometry_fragment.glsl", "lighting.glsl"):
        p = dest / "shaders/lib" / name
        text = p.read_text(encoding="utf-8")
        assert "12010.5" in text
        p.write_text(text.replace("12010.5", "12013.5"), encoding="utf-8")
    p = dest / "shaders/block.properties"
    with p.open("a", encoding="utf-8") as f:
        f.write("\nblock.12011=minecraft:oak_leaves\nblock.12012=minecraft:spruce_leaves\nblock.12013=minecraft:birch_leaves\n")
    p = dest / "shader-plan.json"
    plan = json.loads(p.read_text(encoding="utf-8"))
    plan["goal"] = "Refine bark ridges into irregular plates and knots, and add detailed oak/spruce/birch leaf cutouts. Preserve other candidate02 materials and water/sky algorithms."
    for feature in plan["features"]:
        if feature["name"] == "Expanded companion block materials":
            feature["limitations"] = "Requires BlocksLab-materials-03. Bark/foliage candidate03 is unverified in game. Leaves retain cubic face geometry; no true leaf scattering or wind animation. Dielectric subset only, no POM/displacement/full LabPBR compliance."
    p.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab candidate 03

Pair with BlocksLab-materials-03.zip, above older resource packs. Adds matte
normal/surface-map coverage for oak, spruce and birch leaves. Existing texture
alpha discard and alpha-tested shadow pass are preserved. Water, sky and lighting
algorithms are unchanged from candidate02. New bark replaces the barcode-like
vertical pattern with broken plates, fissures and localized knots/scars.

Enable See-Through Leaves in Minecraft 1.21.11; custom clients may expose a
different foliage-quality label. Check gaps and silhouettes against bright sky,
leaf shadows, canopy interiors, distance shimmer, biome tint and rotated logs.
The leaf sprites are finer, but block silhouettes/geometry remain cubic. There
is no leaf wind, volumetric foliage or true subsurface scattering. New appearance
needs owner acceptance. Sand and all unrelated candidate02 textures are preserved.
""", encoding="utf-8")


def build():
    dest = ROOT / "material-foundations/blocks-lab-03"
    shutil.copytree(ROOT / "material-foundations/blocks-lab-02", dest, dirs_exist_ok=True)
    folder = dest / "assets/minecraft/textures/block"
    for name in NAMES:
        for suffix, data in zip(("", "_n", "_s"), encode(name)):
            Image.fromarray(data).save(folder / f"{name}{suffix}.png", optimize=True)
    p = dest / "pack.mcmeta"
    data = json.loads(p.read_text(encoding="utf-8"))
    data["pack"]["description"] = "BlocksLab03 - irregular bark and fine oak/spruce/birch foliage (512px)"
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab materials 03

Original 512px procedural oak/spruce/birch bark and leaf textures with matching
normal/surface maps. Leaf shapes are neutral grayscale with RGBA cutout gaps;
Minecraft supplies biome/species tint. Transparent pixels retain non-black colour
to reduce dark filtering fringes. Normals/height share their material field.
Other candidate02 materials, including sand and log ends, are byte-for-byte unchanged.

Enable above materials02 and select BlocksLab-candidate-03. Use See-Through Leaves
for Minecraft 1.21.11, or the equivalent foliage-quality option in your client.
Inspect bark in sunlight and shade, rotated logs, leaf gaps against the sky, leaf
shadows, canopy interiors, biome tint, repetition and mip/distance shimmer.
This is not a photo scan, a 3D leaf model, wind animation or subsurface scattering.
Other tree species/plants stay vanilla; new appearance is not yet owner-approved.
Rebuild with scripts/shaders/build-bark-leaves.py (numpy + Pillow).

Transparency setting reference, checked 2026-10-24:
https://feedback.minecraft.net/hc/en-us/articles/41809981427213-Minecraft-Java-Edition-1-21-11-Mounts-of-Mayhem
""", encoding="utf-8")
    shader()
    archive = BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in sorted(dest.rglob("*")):
            if p.is_symlink(): raise ValueError("No symlinks")
            if p.is_file():
                info = zipfile.ZipInfo(p.relative_to(dest).as_posix(), (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, p.read_bytes())
    target = ROOT.parent / "outputs/BlocksLab-materials-03.zip"
    if target.exists() and target.read_bytes() != archive.getvalue(): raise ValueError("Choose a new candidate version")
    target.write_bytes(archive.getvalue())
    preview = Image.new("RGB", (768, 560), "#192224")
    draw = ImageDraw.Draw(preview)
    for i, name in enumerate(NAMES):
        x, y = i % 3 * 256, i // 3 * 280
        draw.text((x + 8, y + 7), name, fill="white")
        tile = Image.open(folder / f"{name}.png").resize((256, 256), Image.Resampling.LANCZOS)
        if name.endswith("_leaves"):
            # Display-only tint and checkerboard; the shipped asset is neutral.
            pixels = np.array(tile).copy()
            pixels[..., :3] = (pixels[..., :3] * np.array([.48, .68, .32])).astype(np.uint8)
            tile = Image.fromarray(pixels)
            checker = Image.new("RGB", tile.size)
            check = ImageDraw.Draw(checker)
            for yy in range(0, 256, 16):
                for xx in range(0, 256, 16):
                    check.rectangle((xx, yy, xx + 15, yy + 15), fill="#b4c2cc" if (xx // 16 + yy // 16) % 2 else "#d9e3e9")
            checker.paste(tile, (0, 0), tile)
            tile = checker
        preview.paste(tile, (x, y + 24))
    preview.save(ROOT.parent / "outputs/BlocksLab-materials-03-preview.png")
    print(f"Built bark/leaves: {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    build()
