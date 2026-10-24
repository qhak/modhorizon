"""Candidate04: finer foliage, tufted turf, and connected short/tall grass sprites."""
from pathlib import Path
from io import BytesIO
import importlib.util
import json
import shutil
import zipfile
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("foliage03", Path(__file__).with_name("build-bark-leaves.py"))
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
noise, smooth, torus = previous.noise, previous.smooth, previous.torus
LEAVES = ("oak_leaves", "spruce_leaves", "birch_leaves")
GRASS = ("grass_block_top", "grass_block_side_overlay", "short_grass", "tall_grass_top", "tall_grass_bottom")
NAMES = LEAVES + GRASS
BACKLIGHT = """    // Restrained directional transmission approximation, not true SSS.
    // Existing shadow visibility and sky/block occlusion still gate incident light.
    if (material > 12010.5 && material < 12015.5) {
        float backLight = pow(max(dot(-light, eye), 0.0), 4.0);
        colour += diffuseAlbedo * incident * backLight * 0.16;
    }
"""


def plant(u, v):
    rng = np.random.default_rng(2241)
    y = 1 - v
    alpha, height = np.zeros_like(u), np.full_like(u, .45)
    grey = .70 + .035 * (noise(u, v, 128, 2242) - .5)
    for _ in range(65):
        root, length, lean = rng.random(), rng.uniform(.20, .98), rng.uniform(-.20, .20)
        t = np.clip(y / length, 0, 1)
        centre = root + lean * t ** 1.7
        width = rng.uniform(.004, .011) * (1 - t) ** .65
        distance = np.abs(torus(u, centre))
        mask = (1 - smooth(np.maximum(width - .001, 0), width + .001, distance))
        mask *= smooth(-.002, .003, y) * (1 - smooth(length - .007, length, y))
        tone = rng.uniform(.58, .89) + .055 * t - .035 * smooth(0, np.maximum(width, .0001), distance)
        grey = grey * (1 - mask) + tone * mask
        height = height * (1 - mask) + (.49 + .025 * (1 - t)) * mask
        alpha = 1 - (1 - alpha) * (1 - mask)
    return np.repeat(grey[..., None], 3, axis=-1), height, .0007, .07, 50, alpha


def turf(u, v):
    rng = np.random.default_rng(2181)
    fine, patches = noise(u, v, 128, 2182), noise(u, v, 13, 2183)
    grey = .57 + .13 * patches + .10 * (fine - .5)
    height = .34 + .10 * patches + .09 * fine
    for _ in range(360):
        cx, cy, angle = rng.random(), rng.random(), rng.uniform(0, 2 * np.pi)
        dx, dy = torus(u, cx), torus(v, cy)
        a = (dx * np.cos(angle) + dy * np.sin(angle)) / rng.uniform(.022, .055)
        b = (-dx * np.sin(angle) + dy * np.cos(angle)) / rng.uniform(.002, .005)
        radius = np.sqrt(a * a + b * b)
        mask = 1 - smooth(.85, 1.05, radius)
        tone = rng.uniform(.65, .88) + .035 * (fine - .5)
        grey = grey * (1 - mask) + tone * mask
        height = height * (1 - mask) + (.48 + .045 * np.maximum(1 - radius, 0)) * mask
    return np.repeat(grey[..., None], 3, axis=-1), height, .0012, .06, 60


def material(name, u, v):
    if name in LEAVES:
        return previous.foliage(name, u, v, detail_scale=.58, density=2.9, vein_boost=2.1)
    if name == "short_grass": return plant(u, v)
    if name == "tall_grass_top": return plant(u, v * .5)
    if name == "tall_grass_bottom": return plant(u, .5 + v * .5)
    field = turf(u, v)
    if name == "grass_block_side_overlay":
        edge = .10 + .08 * noise(u, np.zeros_like(v), 31, 2184) + .04 * noise(u, np.zeros_like(v), 65, 2185)
        return (*field, 1 - smooth(edge, edge + .009, v))
    return field


def maps(field, scale=512, periodic_y=True):
    colour, h, amp, gloss, pore = field[:5]
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * scale * amp / 2
    if periodic_y:
        dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * scale * amp / 2
    else:
        # Tall-grass normals are computed across the complete two-block plant,
        # before splitting the sprite, so each half has the same seam context.
        padded = np.pad(h, ((1, 1), (0, 0)), mode="edge")
        dy = (padded[2:] - padded[:-2]) * scale * amp / 2
    n = np.stack((-dx, -dy, np.ones_like(h)), axis=-1)
    n /= np.linalg.norm(n, axis=-1)[..., None]
    normal = np.empty((*h.shape, 4), dtype=np.uint8)
    normal[..., :2] = np.rint((n[..., :2] * .5 + .5) * 255)
    normal[..., 2] = 255
    normal[..., 3] = np.rint(np.clip(.35 + .5 * h, .01, 1) * 255)
    surface = np.zeros_like(normal)
    surface[..., 0], surface[..., 1], surface[..., 2], surface[..., 3] = round(gloss * 255), 10, pore, 255
    albedo = np.rint(np.clip(colour, 0, 1) * 255).astype(np.uint8)
    if len(field) == 6:
        albedo = np.concatenate((albedo, np.rint(field[5] * 255).astype(np.uint8)[..., None]), axis=-1)
    return albedo, normal, surface


def encode(name, size=512):
    if name.startswith("tall_grass_"):
        v, u = np.mgrid[0:size * 2, 0:size].astype(float)
        field = plant(u / size, v / (size * 2))
        result = maps(field, size, periodic_y=False)
        rows = slice(0, size) if name.endswith("_top") else slice(size, size * 2)
        return tuple(image[rows] for image in result)
    v, u = np.mgrid[0:size, 0:size].astype(float) / size
    return maps(material(name, u, v), size, periodic_y=name != "short_grass")


def shader():
    dest = ROOT / "shader-foundations/blocks-lab-04"
    shutil.copytree(ROOT / "shader-foundations/blocks-lab-03", dest, dirs_exist_ok=True)
    for name in ("geometry_fragment.glsl", "lighting.glsl"):
        p = dest / "shaders/lib" / name
        text = p.read_text(encoding="utf-8").replace("12013.5", "12015.5")
        if name == "lighting.glsl":
            marker = "    return max(colour, vec3(0.0));"
            assert marker in text
            text = text.replace(marker, BACKLIGHT + marker, 1)
        p.write_text(text, encoding="utf-8")
    p = dest / "shaders/block.properties"
    with p.open("a", encoding="utf-8") as f:
        f.write("\nblock.12014=minecraft:short_grass\nblock.12015=minecraft:tall_grass\n")
    p = dest / "shader-plan.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    data["goal"] = "Finer leaves/veins, tufted ground grass and short/tall grass sprites with restrained shadow-gated vegetation backlighting; preserve bark, other materials and water."
    for feature in data["features"]:
        if feature["name"] == "Expanded companion block materials":
            feature["limitations"] = "Requires BlocksLab-materials-04. Vegetation backlighting is a directional approximation, not true SSS. No added geometry or wind; new appearance needs owner acceptance."
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab candidate 04

Pair with materials04. Finer oak/spruce/birch leaves and veins, tufted grass top
and edge, and short/tall grass cutouts. Vegetation gets restrained shadow-gated
directional backlighting, not true subsurface scattering. Bark, non-vegetation
lighting, water, sky and alpha-test paths are preserved. No geometry or wind.
Use See-Through Leaves, check against the sun and inside canopy, grass under
torch/night light, tall-grass middle seam, biome tint and distant shimmer.
No visual acceptance or FPS claim; use one shader pack at a time.
""", encoding="utf-8")


def build():
    dest = ROOT / "material-foundations/blocks-lab-04"
    shutil.copytree(ROOT / "material-foundations/blocks-lab-03", dest, dirs_exist_ok=True)
    folder = dest / "assets/minecraft/textures/block"
    for name in NAMES:
        for suffix, image in zip(("", "_n", "_s"), encode(name)):
            Image.fromarray(image).save(folder / f"{name}{suffix}.png", optimize=True)
    p = dest / "pack.mcmeta"
    data = json.loads(p.read_text(encoding="utf-8")); data["pack"]["description"] = "BlocksLab04 - finer foliage, tufted turf and short/tall grass (512px)"
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    (dest / "README.md").write_text("""# BlocksLab materials 04

Enable above older packs and use BlocksLab-candidate-04. Changes oak/spruce/birch
leaves, grass-block top/side fringe, short grass and tall-grass upper/lower halves.
Leaves are smaller/more varied with stronger vein pigment detail. Ground turf has
individual fine blade marks and darker gaps; plants use tapered curved blades.
The tall plant is baked as one continuous two-block field before splitting.
Albedo is neutral grayscale for Minecraft tint; maps are original procedural
512px assets. Bark, sand and unrelated candidate03 textures are byte-identical.
No photo scans, new plant geometry or wind. Existing crossed/cubic geometry remains.
Inspect repetition, leaf/plant gaps, biome tint, tall-grass seam and mip shimmer.
Appearance/performance await in-game checks. Rebuild: build-grass-foliage.py.
""", encoding="utf-8")
    shader()
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p in sorted(dest.rglob("*")):
            if p.is_symlink(): raise ValueError("No symlinks")
            if p.is_file():
                info = zipfile.ZipInfo(p.relative_to(dest).as_posix(), (1980, 1, 1, 0, 0, 0)); info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, p.read_bytes())
    target = ROOT.parent / "outputs/BlocksLab-materials-04.zip"
    if target.exists() and target.read_bytes() != buf.getvalue(): raise ValueError("Use a new candidate version")
    target.write_bytes(buf.getvalue())
    preview = Image.new("RGB", (1024, 560), "#151d22"); draw = ImageDraw.Draw(preview)
    for i, name in enumerate(NAMES):
        x, y = i % 4 * 256, i // 4 * 280
        draw.text((x + 8, y + 6), name, fill="white")
        tile = Image.open(folder / f"{name}.png").convert("RGBA").resize((256, 256), Image.Resampling.LANCZOS)
        data = np.array(tile).copy(); data[..., :3] = (data[..., :3] * np.array([.5, .72, .33])).astype(np.uint8)
        background = Image.new("RGB", tile.size, "#c8d4df"); tinted = Image.fromarray(data)
        background.paste(tinted, (0, 0), tinted); preview.paste(background, (x, y + 24))
    preview.save(ROOT.parent / "outputs/BlocksLab-materials-04-preview.png")
    print(f"Built grass/foliage04: {target.stat().st_size:,} bytes")


if __name__ == "__main__": build()
