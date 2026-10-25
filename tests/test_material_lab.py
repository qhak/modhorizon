"""Material encoding and component isolation; no game/appearance claims."""
from pathlib import Path
import importlib.util
import unittest
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("material_lab", ROOT / "scripts/shaders/build-material-lab.py")
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)
NAMES = ("sand", "stone", "oak_planks")


class MaterialLabTests(unittest.TestCase):
    def test_source_fields_repeat_in_both_axes_without_a_discontinuity(self):
        rng = np.random.default_rng(123)
        u, v = rng.random(200), rng.random(200)
        for name in NAMES:
            for du, dv in [(1, 0), (0, 1), (-1, 2)]:
                a, h, *_ = lab.material(name, u, v)
                b, j, *_ = lab.material(name, u + du, v + dv)
                np.testing.assert_allclose(a, b, atol=1e-12)
                np.testing.assert_allclose(h, j, atol=1e-12)

    def test_committed_maps_match_reproducible_correlated_materials(self):
        folder = ROOT / "material-foundations/blocks-lab-01/assets/minecraft/textures/block"
        for name in NAMES:
            for suffix, expected in zip(("", "_n", "_s"), lab.encode(name)):
                actual = np.array(Image.open(folder / f"{name}{suffix}.png"))
                np.testing.assert_array_equal(actual, expected)

    def test_material_data_is_non_emissive_dielectric_with_reconstructable_normals(self):
        for name in NAMES:
            colour, normal, surface = lab.encode(name, 128)
            self.assertGreater(float(colour.std()), 2)
            self.assertTrue(np.all(surface[..., 1] == 10))
            self.assertTrue(np.all(surface[..., 3] == 255))
            self.assertTrue(np.all(normal[..., 2] == 255))
            self.assertTrue(np.all(normal[..., 3] > 0))
            xy = normal[..., :2].astype(float) / 255 * 2 - 1
            self.assertTrue(np.all(np.sum(xy * xy, axis=-1) < 1))

    def test_block_candidate_preserves_water_and_non_terrain_lighting(self):
        base = ROOT / "shader-foundations/aurora-horizon/shaders"
        blocks = ROOT / "shader-foundations/blocks-lab-01/shaders"
        for name in ["gbuffers_water.vsh", "gbuffers_water.fsh", "begin.fsh", "composite.fsh", "deferred.fsh", "final.fsh", "lib/common.glsl"]:
            self.assertEqual((base / name).read_bytes(), (blocks / name).read_bytes(), name)
        a = (base / "lib/lighting.glsl").read_text(encoding="utf-8").split("// Terrain-only extension:")[0]
        b = (blocks / "lib/lighting.glsl").read_text(encoding="utf-8").split("// Terrain-only extension:")[0]
        self.assertEqual(a, b)

    def test_sky_candidate_changes_only_shared_sky_function_in_rendering_source(self):
        base = ROOT / "shader-foundations/aurora-horizon/shaders"
        sky = ROOT / "shader-foundations/clean-sky-lab-01/shaders"
        for source in base.rglob("*"):
            if source.is_file() and source.relative_to(base).as_posix() != "lib/common.glsl":
                self.assertEqual(source.read_bytes(), (sky / source.relative_to(base)).read_bytes())
        a, b = [(p / "lib/common.glsl").read_text(encoding="utf-8") for p in [base, sky]]
        for cut in [lambda x: x.split("vec3 skyRadiance(")[0], lambda x: x.split("vec3 viewPosition(")[1]]:
            self.assertEqual(cut(a), cut(b))


if __name__ == "__main__":
    unittest.main()
