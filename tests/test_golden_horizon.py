"""Measure actual retained GLSL; synthetic inputs are not an Iris visual test."""
from pathlib import Path
import ctypes as C
import math
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT / 'scripts/shaders'))
if sys.platform == 'win32':
    from probe_sky_background import HiddenContext, Renderer, expand

def uniform(renderer, name, value):
    renderer.ctx.function('glUniform1f', None, C.c_int, C.c_float)(renderer.location(name), value)

@unittest.skipUnless(sys.platform == 'win32', 'Requires native Windows OpenGL')
class GoldenHorizon(unittest.TestCase):
    def sky(self, version, heights):
        root = ROOT / f'shader-foundations/golden-hour-0{version}/shaders'
        with HiddenContext() as ctx:
            r = Renderer(ctx)
            r.program('#version 120\n' + expand(root/'lib/sky_common.glsl', root) +
                      '\nuniform vec3 testRay; void main(){gl_FragColor=vec4(skyColorWorld(testRay),1.0);}')
            r.sun((0.1, 0.2, -1.0))
            result = []
            for h in heights:
                r.vector('testRay', (0.8*math.sqrt(1-h*h), h, -0.6*math.sqrt(1-h*h)))
                result.append(r.draw()[:3])
            return result

    def test_old_branch_jump_reproduced_and_new_sky_continuous(self):
        for version in [1, 2]:
            a,b=self.sky(version,[-.040001, -.039999])
            jump=max(abs(x-y) for x,y in zip(a,b))
            if version == 1: self.assertGreater(jump,.05)
            else: self.assertLess(jump,.0001)

    def test_day_night_rain_samples_finite_across_entire_lower_sky(self):
        root=ROOT/'shader-foundations/golden-hour-02/shaders'
        with HiddenContext() as ctx:
            r=Renderer(ctx)
            r.program('#version 120\n'+expand(root/'lib/sky_common.glsl',root)+
                      '\nuniform vec3 testRay; void main(){gl_FragColor=vec4(skyColorWorld(testRay),1.0);}')
            for sun in [(0,.8,-1),(0,.03,-1),(0,-.8,-1)]:
                r.sun(sun)
                for rain in [0.,1.]:
                    uniform(r,'rainStrength',rain)
                    for h in [-1.,-.5,-.12,-.04,0.,.1,.7,1.]:
                        r.vector('testRay',(math.sqrt(max(0,1-h*h)),h,0))
                        self.assertTrue(all(math.isfinite(x) and 0<=x<10 for x in r.draw()))

    def water(self, version, distance, material=10008., underwater=0):
        root=ROOT/f'shader-foundations/golden-hour-0{version}/shaders'
        varyings=(root/'lib/terrain_varyings.glsl').read_text()
        vertex='#version 120\n'+varyings+'''
uniform float testDistance; uniform float testMaterial;
void main(){
 gl_Position=gl_Vertex; vUV=vec2(.5); vLM=vec2(.97); vColour=vec4(1.0);
 vViewPos=normalize(vec3(0.,-.04,-1.))*testDistance; vPlayer=vViewPos;
 vNormalPlayer=vec3(0.,1.,0.); vNormalView=vNormalPlayer; vMaterial=testMaterial;
}'''
        with HiddenContext() as ctx:
            r=Renderer(ctx)
            r.program(expand(root/'gbuffers_water.fsh',root),vertex)
            r.sun((.1,.2,-1.))
            uniform(r,'testDistance',distance); uniform(r,'testMaterial',material)
            ctx.function('glUniform1i',None,C.c_int,C.c_int)(r.location('isEyeInWater'),underwater)
            atlas_alpha = 1.0 if material == 10008. else .35
            for name,unit,pixel in [('texture',0,(.5,.5,.5,atlas_alpha)),('lightmap',1,(.8,.8,1,1)),
                ('colortex4',2,(.2,.3,.4,1)),('depthtex1',3,(1,1,1,1))]:
                r.texture(name,unit,pixel)
            sample=r.draw()
            r.program('#version 120\n'+expand(root/'lib/sky_common.glsl',root)+
                      '\nvoid main(){gl_FragColor=vec4(skyColorWorld(normalize(vec3(0.,-.04,-1.))),1.0);}')
            r.sun((.1,.2,-1.))
            return sample,r.draw()

    def test_far_water_matches_viewing_sky_and_does_not_leak_bed(self):
        old,oldsky=self.water(1,260.)
        self.assertLess(old[3],.8)
        self.assertGreater(max(abs(x-y) for x,y in zip(old[:3],oldsky[:3])),.05)
        new,sky=self.water(2,260.)
        self.assertAlmostEqual(new[3],1.,places=5)
        self.assertLess(max(abs(x-y) for x,y in zip(new,sky)),.0001)

    def test_near_water_underwater_and_glass_retain_transparency(self):
        for distance,underwater in [(12.,0),(260.,1)]:
            sample,_=self.water(2,distance,underwater=underwater)
            self.assertTrue(all(math.isfinite(x) for x in sample))
            self.assertLess(sample[3],.8)
        a,_=self.water(1,260.,material=0.)
        b,_=self.water(2,260.,material=0.)
        self.assertLess(max(abs(x-y) for x,y in zip(a,b)),1e-5)
        self.assertAlmostEqual(b[3],.35,places=5)

    def test_source_scope_retains_reflection_trace_wave_and_material_contract(self):
        old,new=[ROOT/f'shader-foundations/golden-hour-0{n}/shaders' for n in [1,2]]
        allowed={'lib/sky_common.glsl','gbuffers_water.fsh','gbuffers_terrain.fsh',
                 'gbuffers_terrain_solid.fsh','gbuffers_terrain_cutout.fsh','shaders.properties'}
        for p in old.rglob('*'):
            if p.is_file() and p.relative_to(old).as_posix() not in allowed:
                self.assertEqual(p.read_bytes(),(new/p.relative_to(old)).read_bytes(),str(p))
        a,b=[(root/'gbuffers_water.fsh').read_text() for root in [old,new]]
        for begin,end in [('vec3 mhTraceReflection(', 'float mhWaterHeight('),('float mhWaterHeight(', 'void main()')]:
            self.assertEqual(a[a.index(begin):a.index(end)],b[b.index(begin):b.index(end)])

if __name__ == '__main__': unittest.main()
