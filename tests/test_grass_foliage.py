from pathlib import Path
import importlib.util
import unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("grass04", ROOT / "scripts/shaders/build-grass-foliage.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)
OLD = ROOT / "material-foundations/blocks-lab-03/assets/minecraft/textures/block"
NEW = ROOT / "material-foundations/blocks-lab-04/assets/minecraft/textures/block"


class GrassFoliage(unittest.TestCase):
    def test_periodic_ground_and_foliage_fields_and_horizontal_plant_edges(self):
        rng = np.random.default_rng(99)
        u, v = rng.random(60), rng.random(60)
        for name in lab.NAMES:
            original = lab.material(name, u, v)
            for du, dv in ([(1, 0), (0, 1)] if name in (*lab.LEAVES, "grass_block_top") else [(1, 0)]):
                shifted = lab.material(name, u + du, v + dv)
                for i in ([0, 1, 5] if len(original) == 6 else [0, 1]):
                    np.testing.assert_allclose(original[i], shifted[i], atol=1e-10, err_msg=name)

    def test_tall_grass_halves_share_the_same_boundary_field_and_normals(self):
        u = np.linspace(0, .999, 100)
        top = lab.material("tall_grass_top", u, np.ones_like(u))
        bottom = lab.material("tall_grass_bottom", u, np.zeros_like(u))
        for i in [0, 1, 5]: np.testing.assert_array_equal(top[i], bottom[i])
        size = 64
        v, u = np.mgrid[0:size * 2, 0:size].astype(float)
        whole = lab.maps(lab.plant(u / size, v / (size * 2)), size, periodic_y=False)
        for half, rows in [("top", slice(0, size)), ("bottom", slice(size, size * 2))]:
            for actual, expected in zip(lab.encode("tall_grass_" + half, size), whole):
                np.testing.assert_array_equal(actual, expected[rows])

    def test_plants_have_neutral_cutout_colour_and_finer_leaf_silhouettes(self):
        for name in (*lab.LEAVES, "short_grass", "tall_grass_top", "tall_grass_bottom"):
            image = np.array(Image.open(NEW / f"{name}.png"))
            self.assertEqual(image.shape, (512, 512, 4))
            self.assertTrue(np.any(image[..., 3] == 0), name)
            self.assertTrue(np.any(image[..., 3] > 220), name)
            np.testing.assert_array_equal(image[..., 0], image[..., 1])
            np.testing.assert_array_equal(image[..., 1], image[..., 2])
            self.assertGreater(int(image[..., :3].min()), 70)
            if name in lab.LEAVES:
                old = np.array(Image.open(OLD / f"{name}.png"))[..., 3] >= 128
                new = image[..., 3] >= 128
                edges = lambda a: np.mean(a != np.roll(a, 1, axis=0)) + np.mean(a != np.roll(a, 1, axis=1))
                self.assertGreater(edges(new), edges(old) * 1.2, name)
                self.assertTrue(.30 < np.mean(new) < .85)

    def test_all_other_materials_and_water_sky_are_preserved(self):
        changed = {f"{name}{suffix}.png" for name in lab.NAMES for suffix in ("", "_n", "_s")}
        for p in OLD.glob("*.png"):
            if p.name not in changed: self.assertEqual(p.read_bytes(), (NEW / p.name).read_bytes(), p.name)
        a, b = [ROOT / f"shader-foundations/blocks-lab-0{n}/shaders" for n in [3, 4]]
        for p in a.rglob("*"):
            if not p.is_file(): continue
            name = p.relative_to(a).as_posix()
            if name == "block.properties": continue
            original, revised = p.read_text(encoding="utf-8"), (b / name).read_text(encoding="utf-8")
            if name in ("lib/geometry_fragment.glsl", "lib/lighting.glsl"):
                original = original.replace("12013.5", "12015.5")
            if name == "lib/lighting.glsl": revised = revised.replace(lab.BACKLIGHT, "")
            self.assertEqual(original, revised, name)

    def test_sampled_png_data_and_plant_material_ids(self):
        rng = np.random.default_rng(11)
        x, y = rng.integers(0, 512, 40), rng.integers(0, 512, 40)
        for name in lab.NAMES:
            field = lab.material(name, x / 512, y / 512)
            image = np.array(Image.open(NEW / f"{name}.png"))
            np.testing.assert_array_equal(image[y, x, :3], np.rint(np.clip(field[0], 0, 1) * 255).astype(np.uint8))
            if len(field) == 6:
                np.testing.assert_array_equal(image[y, x, 3], np.rint(field[5] * 255).astype(np.uint8))
        text = (ROOT / "shader-foundations/blocks-lab-04/shaders/block.properties").read_text(encoding="utf-8")
        self.assertIn("block.12014=minecraft:short_grass", text)
        self.assertIn("block.12015=minecraft:tall_grass", text)


if __name__ == "__main__": unittest.main()
