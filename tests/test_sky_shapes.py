from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import math
import sys
import unittest
ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'scripts/shaders'))
if sys.platform == 'win32':
    from probe_sky_background import Renderer, HiddenContext, expand, probe

@unittest.skipUnless(sys.platform == 'win32', 'Requires native Windows OpenGL')
class SkyShapes(unittest.TestCase):
    def test_background_geometry_and_translucency_contract(self):
        with redirect_stdout(StringIO()): result = probe(ROOT / 'shader-foundations/blocks-lab-06')
        for name, value in result.items():
            if isinstance(value, bool): self.assertTrue(value, name)

    def test_actual_sun_has_larger_bright_angular_footprint(self):
        samples = []
        with HiddenContext() as ctx:
            r = Renderer(ctx)
            for version in [5, 6]:
                root = ROOT / f'shader-foundations/blocks-lab-0{version}/shaders'
                common = expand(root / 'lib/common.glsl', root)
                r.program('#version 120\n' + common + '\nuniform vec3 testRay; void main(){gl_FragColor=vec4(skyRadiance(testRay),1.);}')
                # Below the cloud dome: isolate solar footprint from cloud coverage.
                sun = (0., -.03, -1.)
                r.sun(sun)
                angle = .018
                r.vector('testRay', (math.sin(angle), -.03, -math.cos(angle)))
                samples.append(r.draw()[:3])
                r.vector('testRay', (math.sin(.05), -.03, -math.cos(.05)))
                outside = r.draw()[:3]
                self.assertTrue(all(math.isfinite(x) and x >= 0 for x in outside))
                if version == 6: self.assertGreater(sum(samples[-1]), sum(outside) + 5.)
        self.assertGreater(sum(samples[1]), sum(samples[0]) + 5.)

    def test_rendering_scope_is_only_sky_and_atmosphere(self):
        old, new = [ROOT / f'shader-foundations/blocks-lab-0{n}/shaders' for n in [5, 6]]
        for p in old.rglob('*'):
            if p.is_file() and p.relative_to(old).as_posix() not in ['lib/common.glsl', 'composite.fsh']:
                self.assertEqual(p.read_bytes(), (new / p.relative_to(old)).read_bytes())
        a,b=[(x/'lib/common.glsl').read_text() for x in [old,new]]
        self.assertEqual(a.split('vec3 skyRadiance(')[0], b.split('vec3 skyRadiance(')[0])
        self.assertEqual(a.split('vec3 viewPosition(')[1], b.split('vec3 viewPosition(')[1])
        a,b=[(x/'composite.fsh').read_text() for x in [old,new]]
        self.assertEqual(a.replace('FOG_DENSITY * (1.0 + goldenHour() * 0.55 + rainStrength * 2.0)', 'FOG_DENSITY * 0.65 * (1.0 + goldenHour() * 0.15 + rainStrength * 2.0)'),b)

if __name__ == '__main__': unittest.main()
