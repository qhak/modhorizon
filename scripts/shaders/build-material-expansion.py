"""Candidate02 extends the accepted first material test; no provider calls."""
from pathlib import Path
from io import BytesIO
import importlib.util
import json
import shutil
import zipfile
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("base_materials", Path(__file__).with_name("build-material-lab.py"))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
noise = base.noise
BASE_MATERIAL = base.material
WOODS = {"oak": (.55, .37, .20), "spruce": (.35, .24, .14), "birch": (.76, .67, .48)}
NEW_NAMES = ("dirt", "coarse_dirt", "gravel", "grass_block_top", "grass_block_side", "grass_block_side_overlay",
             "spruce_planks", "birch_planks", "oak_log", "oak_log_top", "spruce_log", "spruce_log_top", "birch_log", "birch_log_top")
GROUPS = {
    12003: "oak_planks oak_slab oak_stairs",
    12004: "dirt coarse_dirt grass_block", 12005: "gravel",
    12006: "spruce_planks spruce_slab spruce_stairs",
    12007: "birch_planks birch_slab birch_stairs",
    12008: "oak_log oak_wood", 12009: "spruce_log spruce_wood", 12010: "birch_log birch_wood",
}


def build_shader():
    dest = ROOT / "shader-foundations/blocks-lab-02"
    shutil.copytree(ROOT / "shader-foundations/blocks-lab-01", dest, dirs_exist_ok=True)
    for name in ("geometry_fragment.glsl", "lighting.glsl"):
        p = dest / "shaders/lib" / name
        text = p.read_text(encoding="utf-8")
        assert "12003.5" in text
        p.write_text(text.replace("12003.5", "12010.5"), encoding="utf-8")
    p = dest / "shaders/block.properties"
    assigned = {"minecraft:" + name for values in GROUPS.values() for name in values.split()}
    lines = []
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.startswith("block."):
            key, values = line.split("=", 1)
            if key == "block.12003": continue
            line = key + "=" + " ".join(name for name in values.split() if name not in assigned)
        lines.append(line)
    lines += [f"block.{key}=" + " ".join("minecraft:" + name for name in values.split()) for key, values in GROUPS.items()]
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    p = dest / "shader-plan.json"
    plan = json.loads(p.read_text(encoding="utf-8"))
    plan["goal"] = "Expanded block materials: retain first sand/stone/oak assets, add earth, gravel, grass and oak/spruce/birch bark, end-grain and planks. Keep the accepted water baseline."
    for feature in plan["features"]:
        if feature["name"] == "Three companion block materials":
            feature["name"] = "Expanded companion block materials"
            feature["limitations"] = "Requires BlocksLab-materials-02. New materials need owner visual acceptance; sand has positive candidate01 feedback. Dielectric subset only, no POM/displacement/full LabPBR compliance."
    p.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab candidate 02

Use with BlocksLab-materials-02.zip in Resource Packs, above older packs.
Expands candidate01's mapped material coverage to dirt/coarse dirt/grass blocks,
gravel, oak/spruce/birch planks (including stairs/slabs), logs and wood blocks.
Normal, roughness and F0 maps retain the candidate01 decoder and distance fade.
Water/sky/shadows and other rendering algorithms are unchanged from candidate01.
The original sand, stone and oak-plank texture bytes are preserved in materials02.

Test a dirt/grass cliff, sunlit gravel, planks and rotated logs/cut ends, torch/night,
underwater, distance shimmer and texture repetition. Check grass biome tint and
the alpha-cutout fringe. New material appearance is unverified; original sand has
positive owner feedback. Partial dielectric decoder only; no geometric
displacement/POM or full LabPBR compliance. Other blocks remain vanilla.
Select ONE shader ZIP, not candidate01 and candidate02 together.
""", encoding="utf-8")


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def pebbles(u, v, frequency=23):
    # Periodic jittered Voronoi cells; nearest two distances provide boundaries.
    x, y = np.mod(u, 1) * frequency, np.mod(v, 1) * frequency
    ix, iy = np.floor(x).astype(int), np.floor(y).astype(int)
    rng = np.random.default_rng(143)
    sites = rng.random((frequency, frequency, 2)) * .68 + .16
    colours = rng.random((frequency, frequency))
    nearest, second = np.full_like(u, 100.), np.full_like(u, 100.)
    selected = np.zeros_like(u)
    for dy in range(-1, 2):
        for dx in range(-1, 2):
            cx, cy = (ix + dx) % frequency, (iy + dy) % frequency
            distance = (x - (ix + dx + sites[cy, cx, 0])) ** 2 + (y - (iy + dy + sites[cy, cx, 1])) ** 2
            wins = distance < nearest
            second = np.where(wins, nearest, np.minimum(second, distance))
            selected = np.where(wins, colours[cy, cx], selected)
            nearest = np.minimum(nearest, distance)
    separation = np.sqrt(second) - np.sqrt(nearest)
    return smooth(.015, .15, separation), selected, np.sqrt(nearest)


def material(name, u, v):
    low, mid, fine = noise(u, v, 8, 311), noise(u, v, 32, 312), noise(u, v, 128, 313)
    if name in ("dirt", "coarse_dirt", "grass_block_side"):
        grains = noise(u, v, 256, 314)
        clumps = smooth(.28, .70, mid)
        height = .25 * low + .35 * clumps + .20 * fine + .20 * grains
        colour = np.array([.39, .265, .165]) * (.78 + .28 * low + .26 * mid + .15 * (grains - .5))[..., None]
        if name == "coarse_dirt":
            edge, tone, distance = pebbles(u, v, 16)
            stones = smooth(.72, .88, tone) * edge * (1 - smooth(.32, .64, distance))
            colour = colour * (1 - stones[..., None]) + np.array([.49, .43, .35]) * stones[..., None]
            height += stones * .2
        return colour, height, .003, .06, 64
    if name == "gravel":
        edge, tone, distance = pebbles(u, v)
        # Rounded loose pebbles with visible fine aggregate between them,
        # rather than a fully tessellated paving-stone pattern.
        edge *= 1 - smooth(.32, .66, distance)
        height = .12 + .48 * edge + .14 * fine
        tint = .63 + .45 * tone + .10 * (fine - .5)
        colour = np.array([.49, .47, .43]) * tint[..., None]
        # Mineral colour variation rather than painted directional shadows.
        colour += (tone - .5)[..., None] * np.array([.055, .025, -.015])
        aggregate = np.array([.33, .31, .275]) * (.80 + .28 * fine)[..., None]
        colour = aggregate * (1 - edge[..., None]) + colour * edge[..., None]
        return colour, height, .004, .12, 48
    if name.startswith("grass_block_"):
        blades = noise(u * 4, v * 16, 32, 404)
        height = .20 * low + .45 * fine + .35 * blades
        grey = .72 + .14 * low + .15 * (fine - .5) + .10 * (blades - .5)
        # Minecraft's biome tint supplies the green, not a hardcoded palette.
        return np.repeat(grey[..., None], 3, axis=-1), height, .0015, .07, 60
    wood = next((w for w in WOODS if name.startswith(w + "_")), None)
    if wood:
        if name.endswith("_planks"):
            # Same accepted oak grain/joints, with distinct species colour.
            colour, height, amp, gloss, pore = BASE_MATERIAL("oak_planks", u, v)
            return colour / np.array(WOODS["oak"]) * np.array(WOODS[wood]), height, amp, gloss, pore
        if name.endswith("_top"):
            # Smooth periodic radial coordinates: paired opposite edges agree.
            sx, sy = np.sin(np.pi * u), np.sin(np.pi * v)
            radius = np.sqrt(sx * sx + sy * sy + .02)
            rings = np.sin(2 * np.pi * (radius * 13 + .12 * low))
            height = .45 + .10 * rings + .09 * mid + .05 * fine
            tint = .92 + .11 * rings + .12 * (fine - .5)
            return np.array(WOODS[wood]) * tint[..., None], height, .0015, .20, 12
        if wood == "birch":
            fleck = noise(u * 3, v * 14, 8, 607)
            marks = smooth(.73, .88, fleck) * smooth(.35, .65, mid)
            colour = np.array([.79, .76, .67]) * (.94 + .09 * low + .04 * fine)[..., None]
            colour *= (1 - .78 * marks)[..., None]
            height = .42 + .12 * mid + .10 * fine - .16 * marks
        else:
            furrow = np.sin(2 * np.pi * (u * 26 + .20 * low + .09 * mid))
            ridge = smooth(-.55, .6, furrow)
            height = .22 + .40 * ridge + .12 * mid + .06 * fine
            tint = .60 + .40 * ridge + .18 * low + .12 * (fine - .5)
            colour = np.array(WOODS[wood]) * .78 * tint[..., None]
        return colour, height, .004, .12, 20
    raise ValueError(name)


def encode(name, size=512):
    original = base.material
    try:
        base.material = material
        colour, normal, surface = base.encode(name, size)
    finally:
        base.material = original
    if name == "grass_block_side_overlay":
        v, u = np.mgrid[0:size, 0:size].astype(float) / size
        edge = .13 + .075 * noise(u, np.zeros_like(v), 16, 717)
        alpha = np.rint((1 - smooth(edge, edge + .025, v)) * 255).astype(np.uint8)
        colour = np.concatenate([colour, alpha[..., None]], axis=-1)
    return colour, normal, surface


def build():
    dest = ROOT / "material-foundations/blocks-lab-02"
    shutil.copytree(ROOT / "material-foundations/blocks-lab-01", dest, dirs_exist_ok=True)
    folder = dest / "assets/minecraft/textures/block"
    for name in NEW_NAMES:
        for suffix, data in zip(("", "_n", "_s"), encode(name)):
            Image.fromarray(data).save(folder / f"{name}{suffix}.png", optimize=True)
    metadata = json.loads((dest / "pack.mcmeta").read_text(encoding="utf-8"))
    metadata["pack"]["description"] = "BlocksLab02 - earth, gravel, grass and oak/spruce/birch materials (512px)"
    (dest / "pack.mcmeta").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab materials 02

Enable this resource pack above older BlocksLab packs; pair with BlocksLab-candidate-02.
Preserves the accepted first sand/stone/oak-plank assets byte-for-byte. Adds dirt,
coarse dirt, gravel, biome-tinted grass top/side overlay, spruce/birch planks, and
oak/spruce/birch log bark and cut ends. Logs use real vanilla axis mappings.
These are original 512px procedural materials, not photo scans or extra geometry.
Other species, stripped logs, leaves, plants, ores and other blocks remain vanilla.

Test dirt cliffs/grass edges; gravel in sun and shade; logs on X/Y/Z axes; cut ends;
planks/stairs/slabs; underwater, torch/night, distance shimmer and repeated surfaces.
Only one shader can be selected at once. New material appearance is pending owner
acceptance; sand has positive owner feedback, not a performance benchmark.
Normal/smoothness maps use the same dielectric subset as candidate01. No POM,
displacement or full LabPBR compliance. Surface detail does not change silhouettes.
Rebuild with scripts/shaders/build-material-expansion.py (numpy + Pillow).
""", encoding="utf-8")
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in sorted(dest.rglob("*")):
            if p.is_symlink(): raise ValueError("No symlinks")
            if p.is_file():
                info = zipfile.ZipInfo(p.relative_to(dest).as_posix(), (1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, p.read_bytes())
    target = ROOT.parent / "outputs/BlocksLab-materials-02.zip"
    if target.exists() and target.read_bytes() != buf.getvalue(): raise ValueError("Use a new candidate version")
    target.write_bytes(buf.getvalue())
    names = ["dirt", "coarse_dirt", "gravel", "grass_block_top", "oak_log", "oak_log_top", "spruce_planks", "birch_log"]
    preview = Image.new("RGB", (1024, 560), "#111820")
    draw = ImageDraw.Draw(preview)
    for i, name in enumerate(names):
        x, y = i % 4 * 256, i // 4 * 280
        draw.text((x + 8, y + 7), name, fill="white")
        preview.paste(Image.open(folder / f"{name}.png").resize((256, 256), Image.Resampling.LANCZOS), (x, y + 24))
    preview.save(ROOT.parent / "outputs/BlocksLab-materials-02-preview.png")
    print(f"Built {len(NEW_NAMES)} additional textures: {target.stat().st_size:,} bytes")
    build_shader()


if __name__ == "__main__":
    build()
