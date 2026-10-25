from pathlib import Path
import importlib.util
import unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("expansion", ROOT / "scripts/shaders/build-material-expansion.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class ExpandedMaterials(unittest.TestCase):
    def test_added_fields_are_periodic_for_colour_and_height(self):
        rng = np.random.default_rng(99)
        u, v = rng.random(100), rng.random(100)
        for name in lab.NEW_NAMES:
            a, h, *_ = lab.material(name, u, v)
            for du, dv in [(1, 0), (0, 1), (-1, 2)]:
                b, j, *_ = lab.material(name, u + du, v + dv)
                np.testing.assert_allclose(a, b, atol=1e-11, err_msg=name)
                np.testing.assert_allclose(h, j, atol=1e-11, err_msg=name)

    def test_original_accepted_assets_are_preserved(self):
        old, new = [ROOT / f"material-foundations/blocks-lab-0{n}/assets/minecraft/textures/block" for n in [1, 2]]
        for file in old.glob("*.png"):
            self.assertEqual(file.read_bytes(), (new / file.name).read_bytes(), file.name)

    def test_generated_images_and_channels_match_the_material_fields(self):
        folder = ROOT / "material-foundations/blocks-lab-02/assets/minecraft/textures/block"
        for name in lab.NEW_NAMES:
            for suffix, expected in zip(("", "_n", "_s"), lab.encode(name)):
                np.testing.assert_array_equal(np.array(Image.open(folder / f"{name}{suffix}.png")), expected)
        overlay = np.array(Image.open(folder / "grass_block_side_overlay.png"))
        self.assertTrue(np.all(overlay[0, :, 3] == 255))
        self.assertTrue(np.all(overlay[-1, :, 3] == 0))
        self.assertTrue(np.any((overlay[..., 3] > 0) & (overlay[..., 3] < 255)))

    def test_new_block_ids_have_one_owner_and_all_requested_material_groups(self):
        text = (ROOT / "shader-foundations/blocks-lab-02/shaders/block.properties").read_text(encoding="utf-8")
        ids = {}
        for line in text.splitlines():
            if line.startswith("block."):
                key, values = line.split("=", 1)
                for name in values.split():
                    self.assertNotIn(name, ids, name)
                    ids[name] = int(key.split(".")[1])
        for number, values in lab.GROUPS.items():
            for name in values.split(): self.assertEqual(ids["minecraft:" + name], number)
        self.assertEqual(ids["minecraft:water"], 1001)
        self.assertEqual(ids["minecraft:glass"], 1002)

    def test_water_sky_and_lighting_algorithm_unchanged_from_candidate01(self):
        a, b = [ROOT / f"shader-foundations/blocks-lab-0{n}/shaders" for n in [1, 2]]
        for file in a.rglob("*"):
            if file.is_file():
                name = file.relative_to(a)
                original = file.read_text(encoding="utf-8")
                revised = (b / name).read_text(encoding="utf-8")
                if name.as_posix() == "block.properties": continue
                if name.as_posix() in ("lib/geometry_fragment.glsl", "lib/lighting.glsl"):
                    original = original.replace("12003.5", "12010.5")
                self.assertEqual(original, revised, str(name))


if __name__ == "__main__":
    unittest.main()
