"""Actual GLSL under controlled native OpenGL inputs; not an Iris scene test."""
from pathlib import Path
import ctypes as C
import math
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT/'shader-foundations/ore-glow-01/shaders'
sys.dont_write_bytecode = True
sys.path.insert(0, str(ROOT/'scripts/shaders'))
if sys.platform == 'win32':
    from probe_sky_background import HiddenContext, Renderer, expand, prototype


def uniform(r, name, value):
    r.ctx.function('glUniform1f', None, C.c_int, C.c_float)(r.location(name), value)


@unittest.skipUnless(sys.platform == 'win32', 'Native Windows OpenGL required')
class OreGlow(unittest.TestCase):
    def test_actual_labpbr_decoder_gates_ore_ids_and_255_sentinel(self):
        source = expand(PACK/'lib/sky_common.glsl', PACK) + '\n' + expand(PACK/'lib/ore_emission.glsl', PACK)
        with HiddenContext() as ctx:
            r = Renderer(ctx)
            r.program('#version 120\n'+source+'''
uniform float testMaterial;
void main(){float e=mhOreEmission(vec2(.5),testMaterial);gl_FragColor=vec4(e,e,e,1.);}
''')
            for material in (20001., 20002., 20018.):
                uniform(r, 'testMaterial', material)
                for alpha, expected in ((0.,0.), (.5, .5*255./254.), (254./255.,1.), (1.,0.)):
                    r.texture('specular', 0, (0.,10./255.,0.,alpha))
                    self.assertAlmostEqual(r.draw()[0], expected, places=4)
            r.texture('specular', 0, (0.,10./255.,0.,254./255.))
            for material in (0.,10008.,10009.,20000.,20019.):
                uniform(r, 'testMaterial', material)
                self.assertAlmostEqual(r.draw()[0],0.,places=6)

    def terrain(self, alpha, material=20002., underwater=0):
        varyings = (PACK/'lib/terrain_varyings.glsl').read_text()
        vertex = '#version 120\n'+varyings+'''
uniform float testMaterial;
void main(){gl_Position=gl_Vertex;vUV=vec2(.5);vLM=vec2(.03125);vColour=vec4(1.);
 vViewPos=vec3(0.,-1.,-8.);vPlayer=vViewPos;vNormalPlayer=vec3(0.,1.,0.);
 vNormalView=vNormalPlayer;vMaterial=testMaterial;}
'''
        with HiddenContext() as ctx:
            r = Renderer(ctx)
            r.program(expand(PACK/'gbuffers_terrain.fsh',PACK),vertex)
            r.sun((0.,-.8,-.6))
            uniform(r,'testMaterial',material)
            ctx.function('glUniform1i',None,C.c_int,C.c_int)(r.location('isEyeInWater'),underwater)
            for name, unit, pixel in [('texture',0,(.6,.4,.25,1.)),
                    ('shadowtex0',1,(1.,1.,1.,1.)),('specular',2,(0.,10./255.,0.,alpha))]:
                r.texture(name,unit,pixel)
            return r.draw()

    def test_actual_terrain_mineral_stays_bright_in_cave_but_rock_does_not(self):
        rock = self.terrain(0.)
        mineral = self.terrain(254./255.)
        self.assertLess(max(rock[:3]),.04)
        self.assertGreater(mineral[0],rock[0]+.4)
        self.assertGreater(mineral[1],rock[1]+.25)
        for alpha, material in ((1.,20002.),(254./255.,0.),(254./255.,10008.)):
            other = self.terrain(alpha,material)
            self.assertLess(max(abs(a-b) for a,b in zip(rock,other)),1e-5)
        underwater = self.terrain(254./255.,underwater=1)
        self.assertTrue(all(math.isfinite(x) and 0<=x<3 for x in underwater))

    def test_fog_and_underwater_attenuate_emission_visibility(self):
        source = expand(PACK/'lib/sky_common.glsl',PACK)+'\n'+expand(PACK/'lib/ore_emission.glsl',PACK)
        with HiddenContext() as ctx:
            r=Renderer(ctx)
            r.program('#version 120\n'+source+'''
uniform float testFog; uniform float testDistance;
void main(){float e=mhOreVisibility(testFog,testDistance);gl_FragColor=vec4(e,e,e,1.);}
''')
            def sample(fog,distance,water):
                uniform(r,'testFog',fog);uniform(r,'testDistance',distance)
                ctx.function('glUniform1i',None,C.c_int,C.c_int)(r.location('isEyeInWater'),water)
                return r.draw()[0]
            self.assertAlmostEqual(sample(1.,10.,0),0.,places=6)
            above=sample(0.,100.,0);below=sample(0.,100.,1)
            self.assertGreater(above,below)
            self.assertGreaterEqual(below,0.)
            self.assertLess(sample(.5,10.,0),sample(0.,10.,0))

    def test_zero_emission_produces_no_composite_halo_and_foreground_is_protected(self):
        fragment = expand(PACK/'composite.fsh',PACK)
        with HiddenContext() as ctx:
            r=Renderer(ctx,16,16)
            r.program(fragment,expand(PACK/'composite.vsh',PACK))
            for name,unit,pixel in [('colortex0',0,(.05,.06,.07,1.)),
                    ('colortex1',1,(0.,0.,0.,0.)),('depthtex1',2,(.4,.4,.4,1.)),
                    ('depthtex0',3,(.4,.4,.4,1.)),('colortex6',4,(0.,0.,0.,0.))]:
                r.texture(name,unit,pixel)
            dark=r.draw()
            self.assertLess(max(abs(dark[i]-(.05,.06,.07,1.)[i%4]) for i in range(len(dark))),1e-5)
            r.texture('colortex6',4,(.8,.5,.2,1.))
            glow=r.draw()
            self.assertGreater(glow[0],dark[0]+.01)
            self.assertTrue(all(math.isfinite(x) and 0<=x<4 for x in glow))
            # A nearer opaque foreground surface must suppress distant-source bloom.
            r.texture('depthtex0',3,(.2,.2,.2,1.))
            blocked=r.draw()
            self.assertLess(max(abs(a-b) for a,b in zip(blocked,dark)),1e-5)

    def test_actual_opaque_entity_pass_overwrites_a_previous_emission_mask(self):
        with HiddenContext() as ctx:
            r=Renderer(ctx)
            extra=C.c_uint()
            ctx.function('glGenRenderbuffers',None,C.c_int,C.POINTER(C.c_uint))(1,C.byref(extra))
            ctx.function('glBindRenderbuffer',None,C.c_uint,C.c_uint)(0x8D41,extra.value)
            ctx.function('glRenderbufferStorage',None,C.c_uint,C.c_uint,C.c_int,C.c_int)(0x8D41,0x8814,1,1)
            ctx.function('glFramebufferRenderbuffer',None,C.c_uint,C.c_uint,C.c_uint,C.c_uint)(0x8D40,0x8CE1,0x8D41,extra.value)
            attachments=(C.c_uint*2)(0x8CE0,0x8CE1)
            ctx.function('glDrawBuffers',None,C.c_int,C.POINTER(C.c_uint))(2,attachments)
            r.program('#version 120\nvoid main(){gl_FragData[0]=vec4(.1);gl_FragData[1]=vec4(1.);}')
            prototype(ctx.gl,'glReadBuffer',None,C.c_uint)(0x8CE1)
            self.assertGreater(min(r.draw()),.99)
            vertex='''#version 120
varying vec2 vUV;varying vec2 vLM;varying vec4 vColour;
void main(){gl_Position=gl_Vertex;vUV=vec2(.5);vLM=vec2(.5);vColour=vec4(1.);}
'''
            r.program(expand(PACK/'gbuffers_entities.fsh',PACK),vertex)
            r.texture('texture',0,(.3,.3,.3,1.))
            r.texture('lightmap',1,(.4,.4,.4,1.))
            self.assertLess(max(abs(x) for x in r.draw()),1e-6)

    def test_sky_water_and_wave_sources_are_retained(self):
        old=ROOT/'shader-foundations/golden-hour-04/shaders'
        for name in ('lib/sky_common.glsl','gbuffers_water.fsh','lib/water_balance.glsl'):
            self.assertEqual((old/name).read_bytes(),(PACK/name).read_bytes(),name)
        text=(PACK/'block.properties').read_text()
        ids=[]
        for line in text.splitlines():
            if line.startswith('block.20'):
                ids.append(int(line.split('=')[0].split('.')[1]))
        self.assertEqual(ids,list(range(20001,20019)))


if __name__ == '__main__': unittest.main()
