from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / "scripts/shaders"))
if sys.platform == "win32":
    from probe_sky_background import probe


@unittest.skipUnless(sys.platform == "win32", "Requires native Windows OpenGL")
class SkyBackground(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with redirect_stdout(StringIO()):
            cls.old = probe(ROOT / "shader-foundations/blocks-lab-04")
            cls.new = probe(ROOT / "shader-foundations/blocks-lab-05")

    def test_old_sky_trusts_white_scene_background(self):
        for stage in ["composite", "deferred"]:
            self.assertFalse(self.old[stage + " ignores cleared background"])
            self.assertEqual(self.old[stage + " sky sample"], [1., 1., 1.])

    def test_fixed_passes_ignore_cleared_background_and_render_day_and_night(self):
        for name, result in self.new.items():
            if isinstance(result, bool): self.assertTrue(result, name)

    def test_translucency_and_snapshot_agree_without_replacing_geometry(self):
        self.assertTrue(self.new["sky remains behind translucent layer"])
        for a, b in zip(self.new["composite sky sample"], self.new["deferred sky sample"]):
            self.assertAlmostEqual(a, b, places=5)
        for stage in ["composite", "deferred"]:
            self.assertTrue(self.new[stage + " preserves nonempty geometry"])

    def test_source_changes_are_limited_to_background_and_shared_sky(self):
        old, new = [ROOT / f"shader-foundations/blocks-lab-0{n}/shaders" for n in [4, 5]]
        for p in old.rglob("*"):
            if not p.is_file(): continue
            relative = p.relative_to(old)
            if relative.as_posix() in ["lib/common.glsl", "deferred.fsh", "composite.fsh"]: continue
            self.assertEqual(p.read_bytes(), (new / relative).read_bytes(), str(relative))
        a, b = [(root / "lib/common.glsl").read_text(encoding="utf-8") for root in [old, new]]
        self.assertEqual(a.split("vec3 skyRadiance(")[0], b.split("vec3 skyRadiance(")[0])
        self.assertEqual(a.split("vec3 viewPosition(")[1], b.split("vec3 viewPosition(")[1])


if __name__ == "__main__": unittest.main()
