from pathlib import Path
import importlib.util
import unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("bark_leaves", ROOT / "scripts/shaders/build-bark-leaves.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)
FOLDER = ROOT / "material-foundations/blocks-lab-03/assets/minecraft/textures/block"


class BarkLeaves(unittest.TestCase):
    def test_periodic_colour_height_and_leaf_coverage(self):
        rng = np.random.default_rng(12)
        u, v = rng.random(100), rng.random(100)
        for name in lab.NAMES:
            original = lab.foliage(name, u, v) if name.endswith("_leaves") else lab.bark(name, u, v)
            for du, dv in [(1, 0), (0, 1), (-1, 2)]:
                shifted = lab.foliage(name, u + du, v + dv) if name.endswith("_leaves") else lab.bark(name, u + du, v + dv)
                for index in ([0, 1, 5] if name.endswith("_leaves") else [0, 1]):
                    np.testing.assert_allclose(original[index], shifted[index], atol=1e-10, err_msg=name)

    def test_bark_is_less_like_a_full_height_barcode(self):
        for name in ("oak_log", "spruce_log"):
            a = np.array(Image.open(ROOT / f"material-foundations/blocks-lab-02/assets/minecraft/textures/block/{name}.png"), dtype=float).mean(axis=2)
            b = np.array(Image.open(FOLDER / f"{name}.png"), dtype=float).mean(axis=2)
            ratio = lambda image: image.mean(axis=0).std() / image.std()
            self.assertLess(ratio(b), ratio(a) * .75, name)

    def test_leaf_alpha_is_cutout_and_untinted_rgb_has_no_black_fringe(self):
        for name in ("oak_leaves", "spruce_leaves", "birch_leaves"):
            image = np.array(Image.open(FOLDER / f"{name}.png"))
            self.assertEqual(image.shape, (512, 512, 4))
            coverage = np.mean(image[..., 3] >= 128)
            self.assertGreater(coverage, .30, name)
            self.assertLess(coverage, .85, name)
            self.assertTrue(np.any(image[..., 3] == 0))
            self.assertTrue(np.any(image[..., 3] == 255))
            np.testing.assert_array_equal(image[..., 0], image[..., 1])
            np.testing.assert_array_equal(image[..., 1], image[..., 2])
            self.assertGreater(int(image[..., :3].min()), 90)

    def test_stored_material_data_matches_field_samples_and_normals(self):
        rng = np.random.default_rng(15)
        x, y = rng.integers(0, 512, 50), rng.integers(0, 512, 50)
        u, v = x / 512, y / 512
        for name in lab.NAMES:
            colour, h, amp, *_ = lab.material(name, u, v)
            stored = np.array(Image.open(FOLDER / f"{name}.png"))[y, x, :3]
            np.testing.assert_array_equal(stored, np.rint(np.clip(colour, 0, 1) * 255).astype(np.uint8))
            height = lambda du, dv: lab.material(name, u + du, v + dv)[1]
            dx = (height(1 / 512, 0) - height(-1 / 512, 0)) * 512 * amp / 2
            dy = (height(0, 1 / 512) - height(0, -1 / 512)) * 512 * amp / 2
            n = np.stack((-dx, -dy, np.ones_like(h)), axis=-1)
            n /= np.linalg.norm(n, axis=-1)[..., None]
            mapped = np.array(Image.open(FOLDER / f"{name}_n.png"))[y, x]
            np.testing.assert_array_equal(mapped[:, :2], np.rint((n[:, :2] * .5 + .5) * 255).astype(np.uint8))
            self.assertTrue(np.all(mapped[:, 2] == 255))

    def test_only_requested_bark_assets_change_and_rendering_is_isolated(self):
        previous = ROOT / "material-foundations/blocks-lab-02/assets/minecraft/textures/block"
        changed = {f"{name}{suffix}.png" for name in lab.NAMES[:3] for suffix in ("", "_n", "_s")}
        for p in previous.glob("*.png"):
            if p.name not in changed: self.assertEqual(p.read_bytes(), (FOLDER / p.name).read_bytes(), p.name)
        a, b = [ROOT / f"shader-foundations/blocks-lab-0{n}/shaders" for n in [2, 3]]
        for p in a.rglob("*"):
            if p.is_file():
                path = p.relative_to(a)
                original, revised = p.read_text(encoding="utf-8"), (b / path).read_text(encoding="utf-8")
                if path.as_posix() == "block.properties": continue
                if path.as_posix() in ("lib/geometry_fragment.glsl", "lib/lighting.glsl"):
                    original = original.replace("12010.5", "12013.5")
                self.assertEqual(original, revised, str(path))
        props = (b / "block.properties").read_text(encoding="utf-8")
        for index, name in enumerate(("oak", "spruce", "birch"), 12011):
            self.assertIn(f"block.{index}=minecraft:{name}_leaves", props)


if __name__ == "__main__":
    unittest.main()
