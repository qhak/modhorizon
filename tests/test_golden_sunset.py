"""Actual GLSL samples under controlled inputs; not a Minecraft visual test."""
from pathlib import Path
import ctypes as C
import math
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT/'scripts/shaders'))
if sys.platform == 'win32':
    from probe_sky_background import HiddenContext, Renderer, expand

@unittest.skipUnless(sys.platform == 'win32', 'Native Windows OpenGL required')
class GoldenSunset(unittest.TestCase):
    def sample(self, version, elevation, ray=(0., .1, -1.), terrain=False, rain=0., lm=1.):
        root = ROOT/f'shader-foundations/golden-hour-0{version}/shaders'
        with HiddenContext() as ctx:
            r = Renderer(ctx)
            source = expand(root/('lib/terrain_lighting.glsl' if terrain else 'lib/sky_common.glsl'), root)
            body = (f'mhLightSurface(vec3(0.5),vec3(0.,1.,0.),vec3(0.),vec2(0.03125,{lm}))'
                    if terrain else 'skyColorWorld(testRay)')
            r.program('#version 120\n'+source+'\nuniform vec3 testRay; void main(){gl_FragColor=vec4('+body+',1.);}')
            r.sun((0., elevation, -math.sqrt(1.-elevation*elevation)))
            r.vector('testRay', ray)
            ctx.function('glUniform1f', None, C.c_int, C.c_float)(r.location('rainStrength'), rain)
            if terrain: r.texture('shadowtex0', 0, (0.,0.,0.,1.))
            return r.draw()[:3]

    def test_sunset_is_warmer_and_brighter_toward_sun(self):
        old, new = [self.sample(v, .025) for v in (3,4)]
        self.assertGreater(new[0], old[0]*1.15)
        self.assertGreater(new[0]-new[2], old[0]-old[2])
        upper = self.sample(4, .025, (0.,1.,0.))
        self.assertGreater(upper[2], upper[0])

    def test_shadow_fill_increases_outdoors_without_lighting_caves(self):
        old, new = [self.sample(v, .025, terrain=True) for v in (3,4)]
        self.assertGreater(sum(new),sum(old)*1.20)
        cave = self.sample(4, .025, terrain=True, lm=.03125)
        self.assertLess(sum(cave),sum(new)*.15)

    def test_day_night_unchanged_and_transition_samples_finite(self):
        for elevation in (.8,-.8):
            for terrain in (False,True):
                a,b=[self.sample(v,elevation,terrain=terrain) for v in (3,4)]
                self.assertLess(max(abs(x-y) for x,y in zip(a,b)),1e-5)
        for elevation in (-.2,-.1,0.,.1,.3):
            for rain in (0.,1.):
                for ray in ((0.,-.040001,-1.),(0.,-.039999,-1.),(0.,.3,-1.)):
                    self.assertTrue(all(math.isfinite(x) and 0<=x<10 for x in self.sample(4,elevation,ray,rain=rain)))

    def test_retains_wave_trace_and_optical_coverage(self):
        old,new=[ROOT/f'shader-foundations/golden-hour-0{v}/shaders' for v in (3,4)]
        self.assertEqual((old/'lib/water_balance.glsl').read_bytes(),(new/'lib/water_balance.glsl').read_bytes())
        a,b=[(p/'gbuffers_water.fsh').read_text() for p in (old,new)]
        for begin,end in [('vec3 mhTraceReflection(', 'void main()'),('    float alpha =', '    gl_FragData[0] = vec4(surfaceColor, alpha);')]:
            self.assertEqual(a[a.index(begin):a.index(end)],b[b.index(begin):b.index(end)])

if __name__ == '__main__': unittest.main()
