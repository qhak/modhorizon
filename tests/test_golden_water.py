"""Actual GLSL layer/composition tests, not a Minecraft scene or fidelity score."""
from pathlib import Path
import math
import sys
import unittest
ROOT=Path(__file__).resolve().parents[1]
sys.dont_write_bytecode=True
sys.path.insert(0,str(ROOT/'scripts/shaders'))
if sys.platform=='win32':
    from probe_sky_background import HiddenContext, Renderer
    import test_golden_horizon as horizon

@unittest.skipUnless(sys.platform=='win32','Requires native Windows OpenGL')
class GoldenWater(unittest.TestCase):
    def layer(self,path,angle,reflection=(.9,.7,.5),scatter=(.04,.12,.15)):
        helper=(ROOT/'shader-foundations/golden-hour-03/shaders/lib/water_balance.glsl').read_text()
        with HiddenContext() as ctx:
            r=Renderer(ctx)
            r.program('#version 120\n'+helper+'''
uniform vec3 reflected; uniform vec3 scatter;
uniform float pathLength; uniform float nDotV;
void main(){gl_FragColor=mhWaterLayer(reflected,scatter,pathLength,nDotV);}
''')
            r.vector('reflected',reflection); r.vector('scatter',scatter)
            horizon.uniform(r,'pathLength',path);horizon.uniform(r,'nDotV',angle)
            return r.draw()

    def test_layer_and_existing_blend_obey_reflection_scatter_transmission_budget(self):
        reflection=(.9,.7,.5);scatter=(.04,.12,.15);bed=(.2,.1,.05)
        for path in [0.,.25,3.,14.,100.]:
            for angle in [0.,.2,.7,1.]:
                rgba=self.layer(path,angle)
                transmission=math.exp(-path*.22)
                f=.035+.965*(1-angle)**5
                expected=[r*f+s*(1-f)*(1-transmission)+b*(1-f)*transmission
                          for r,s,b in zip(reflection,scatter,bed)]
                composed=[x*rgba[3]+b*(1-rgba[3]) for x,b in zip(rgba[:3],bed)]
                self.assertLess(max(abs(a-b) for a,b in zip(composed,expected)),2e-5)
                self.assertTrue(all(math.isfinite(x) and 0<=x<=1.001 for x in rgba))

    def test_shallows_show_bed_and_deep_water_attenuates_it(self):
        shallow=self.layer(.25,1.)[3];deep=self.layer(14.,1.)[3]
        self.assertLess(shallow,.10)
        self.assertGreater(deep,.95)
        self.assertGreater(deep,shallow)
        self.assertGreater(self.layer(3.,.05)[3],self.layer(3.,1.)[3])

    def test_grazing_reflection_is_not_multiplied_by_old_fixed_opacity(self):
        angle=.05
        rgba=self.layer(14.,angle,reflection=(1.,0.,0.),scatter=(0.,0.,0.))
        old_reflectance=min(.84,max(.14,.14+.72*(1-angle)**4))
        old_alpha=.34+.26*(1-math.exp(-14*.16))
        self.assertGreater(rgba[0]*rgba[3],old_reflectance*old_alpha+.25)

    def test_actual_water_stage_preserves_far_horizon_glass_and_underwater_finiteness(self):
        run=horizon.GoldenHorizon()
        surface,sky=run.water(3,260.)
        self.assertLess(max(abs(a-b) for a,b in zip(surface,sky)),1e-4)
        old,_=run.water(2,260.,material=0.)
        new,_=run.water(3,260.,material=0.)
        self.assertLess(max(abs(a-b) for a,b in zip(old,new)),1e-5)
        self.assertAlmostEqual(new[3],.35,places=5)
        underwater,_=run.water(3,260.,underwater=1)
        self.assertTrue(all(math.isfinite(x) for x in underwater))
        self.assertTrue(0.0<=underwater[3]<=1.0) # grazing Fresnel may reach one

    def test_sky_lighting_wave_and_trace_source_are_preserved(self):
        old,new=[ROOT/f'shader-foundations/golden-hour-0{n}/shaders' for n in [2,3]]
        for p in old.rglob('*'):
            if p.is_file() and p.name!='gbuffers_water.fsh':
                self.assertEqual(p.read_bytes(),(new/p.relative_to(old)).read_bytes(),str(p))
        self.assertEqual({p.relative_to(new).as_posix() for p in new.rglob('*') if p.is_file()}
                         -{p.relative_to(old).as_posix() for p in old.rglob('*') if p.is_file()},
                         {'lib/water_balance.glsl'})
        a,b=[(x/'gbuffers_water.fsh').read_text() for x in [old,new]]
        self.assertEqual(a[a.index('vec3 mhTraceReflection('):a.index('void main()')],
                         b[b.index('vec3 mhTraceReflection('):b.index('void main()')])

if __name__=='__main__':unittest.main()
