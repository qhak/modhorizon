"""Actual GLSL background/snapshot tests in a hidden synthetic GL scene.

Not Iris execution or visual acceptance. Optional preview uses the actual shared
sky helper plus the pack's current exposure/filmic convention, without bloom.
"""
import ctypes as C
from pathlib import Path
import sys
sys.dont_write_bytecode = True
from check_glsl import HiddenContext, expand, prototype

VERTEX = "#version 120\nvarying vec2 vUV;void main(){gl_Position=gl_Vertex;vUV=gl_Vertex.xy*.5+.5;}"


class Renderer:
    def __init__(self, ctx, width=1, height=1):
        self.ctx, self.width, self.height = ctx, width, height
        fbo, rb = C.c_uint(), C.c_uint()
        ctx.function("glGenFramebuffers", None, C.c_int, C.POINTER(C.c_uint))(1, C.byref(fbo))
        ctx.function("glBindFramebuffer", None, C.c_uint, C.c_uint)(0x8D40, fbo.value)
        ctx.function("glGenRenderbuffers", None, C.c_int, C.POINTER(C.c_uint))(1, C.byref(rb))
        ctx.function("glBindRenderbuffer", None, C.c_uint, C.c_uint)(0x8D41, rb.value)
        ctx.function("glRenderbufferStorage", None, C.c_uint, C.c_uint, C.c_int, C.c_int)(0x8D41, 0x8814, width, height)
        ctx.function("glFramebufferRenderbuffer", None, C.c_uint, C.c_uint, C.c_uint, C.c_uint)(0x8D40, 0x8CE0, 0x8D41, rb.value)
        if ctx.function("glCheckFramebufferStatus", C.c_uint, C.c_uint)(0x8D40) != 0x8CD5: raise RuntimeError("Incomplete FBO")
        prototype(ctx.gl, "glDrawBuffer", None, C.c_uint)(0x8CE0)
        prototype(ctx.gl, "glReadBuffer", None, C.c_uint)(0x8CE0)
        prototype(ctx.gl, "glViewport", None, C.c_int, C.c_int, C.c_int, C.c_int)(0, 0, width, height)

    def program(self, fragment, vertex=VERTEX):
        ctx = self.ctx
        create = ctx.function("glCreateShader", C.c_uint, C.c_uint)
        source = ctx.function("glShaderSource", None, C.c_uint, C.c_int, C.POINTER(C.c_char_p), C.POINTER(C.c_int))
        status = ctx.function("glGetShaderiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        program = ctx.function("glCreateProgram", C.c_uint)()
        for text, kind in [(vertex, 0x8B31), (fragment, 0x8B30)]:
            shader = create(kind); data = text.encode(); pointer, length = C.c_char_p(data), C.c_int(len(data))
            source(shader, 1, C.byref(pointer), C.byref(length))
            ctx.function("glCompileShader", None, C.c_uint)(shader)
            ok = C.c_int(); status(shader, 0x8B81, C.byref(ok))
            if not ok.value: raise RuntimeError("Probe shader failed; run check_glsl.py")
            ctx.function("glAttachShader", None, C.c_uint, C.c_uint)(program, shader)
        ctx.function("glLinkProgram", None, C.c_uint)(program)
        ok = C.c_int(); ctx.function("glGetProgramiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))(program, 0x8B82, C.byref(ok))
        if not ok.value: raise RuntimeError("Probe program link failed")
        self.program_id = program
        ctx.function("glUseProgram", None, C.c_uint)(program)
        identity = [1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1., 0., 0., 0., 0., 1.]
        inverse = identity.copy(); inverse[9], inverse[10] = .7, -1.
        for name in ["gbufferModelViewInverse", "gbufferProjection", "gbufferProjectionInverse"]:
            matrix = (C.c_float * 16)(*(inverse if name == "gbufferProjectionInverse" else identity))
            ctx.function("glUniformMatrix4fv", None, C.c_int, C.c_int, C.c_ubyte, C.POINTER(C.c_float))(self.location(name), 1, 0, matrix)
        self.sun((.1, .9, -.2))
        self.vector("cameraPosition", (0, 80, 0))
        for name, value in [("rainStrength", 0), ("frameTimeCounter", 0), ("viewWidth", self.width), ("viewHeight", self.height), ("far", 256)]:
            ctx.function("glUniform1f", None, C.c_int, C.c_float)(self.location(name), value)
        ctx.function("glUniform1i", None, C.c_int, C.c_int)(self.location("isEyeInWater"), 0)

    def location(self, name):
        return self.ctx.function("glGetUniformLocation", C.c_int, C.c_uint, C.c_char_p)(self.program_id, name.encode())

    def vector(self, name, value):
        self.ctx.function("glUniform3f", None, C.c_int, C.c_float, C.c_float, C.c_float)(self.location(name), *value)

    def sun(self, value):
        self.vector("sunPosition", value)
        self.vector("shadowLightPosition", value)

    def texture(self, name, unit, pixel):
        ctx = self.ctx; handle = C.c_uint()
        ctx.function("glActiveTexture", None, C.c_uint)(0x84C0 + unit)
        prototype(ctx.gl, "glGenTextures", None, C.c_int, C.POINTER(C.c_uint))(1, C.byref(handle))
        prototype(ctx.gl, "glBindTexture", None, C.c_uint, C.c_uint)(0x0DE1, handle.value)
        param = prototype(ctx.gl, "glTexParameteri", None, C.c_uint, C.c_uint, C.c_int)
        param(0x0DE1, 0x2801, 0x2600); param(0x0DE1, 0x2800, 0x2600)
        data = (C.c_float * 4)(*pixel)
        prototype(ctx.gl, "glTexImage2D", None, C.c_uint, C.c_int, C.c_int, C.c_int, C.c_int, C.c_int, C.c_uint, C.c_uint, C.c_void_p)(0x0DE1, 0, 0x8814, 1, 1, 0, 0x1908, 0x1406, data)
        ctx.function("glUniform1i", None, C.c_int, C.c_int)(self.location(name), unit)

    def draw(self):
        ctx = self.ctx
        begin = prototype(ctx.gl, "glBegin", None, C.c_uint)
        vertex = prototype(ctx.gl, "glVertex2f", None, C.c_float, C.c_float)
        begin(5)
        for point in [(-1, -1), (1, -1), (-1, 1), (1, 1)]: vertex(*point)
        prototype(ctx.gl, "glEnd", None)()
        result = (C.c_float * (4 * self.width * self.height))()
        prototype(ctx.gl, "glReadPixels", None, C.c_int, C.c_int, C.c_int, C.c_int, C.c_uint, C.c_uint, C.c_void_p)(0, 0, self.width, self.height, 0x1908, 0x1406, result)
        error = prototype(ctx.gl, "glGetError", C.c_uint)()
        if error: raise RuntimeError("OpenGL error: " + hex(error))
        return list(result)


def probe(pack):
    root = Path(pack).resolve() / "shaders"
    results = {}
    with HiddenContext() as ctx:
        renderer = Renderer(ctx)
        for stage in ["composite", "deferred"]:
            renderer.program(expand(root / f"{stage}.fsh", root), expand(root / f"{stage}.vsh", root))
            def render(background, depth=1., overlay=(0., 0., 0., 0.)):
                for name, unit, pixel in [("colortex0", 0, (*background, 1)), ("colortex1", 1, overlay), ("depthtex0", 2, (depth,) * 4), ("depthtex1", 3, (depth,) * 4)]:
                    renderer.texture(name, unit, pixel)
                return renderer.draw()[:3]
            a, b = render((1, 1, 1)), render((1, 0, 1))
            results[stage + " ignores cleared background"] = max(abs(x - y) for x, y in zip(a, b)) < 1e-5
            results[stage + " renders a finite blue day sky"] = all(0 <= x < 3 for x in a) and a[2] > a[0] * 1.15
            ground = render((.16, .23, .31), .999999)
            results[stage + " preserves nonempty geometry"] = max(abs(x - y) for x, y in zip(ground, (.16, .23, .31))) < .005
            if stage == "composite":
                overlay = render((1, 1, 1), overlay=(.2, .3, .1, .5))
                results["sky remains behind translucent layer"] = max(abs(x - (s * .5 + c * .5)) for x, s, c in zip(overlay, a, (.2, .3, .1))) < 1e-5
            results[stage + " sky sample"] = a
            renderer.sun((.1, -.9, -.2))
            night = render((1, 1, 1))
            results[stage + " night is finite and dark away from moon"] = all(0 <= x < .12 for x in night)
    for name, value in results.items(): print(name, value)
    print("Synthetic native pass only; Iris ordering, full-scene visuals and FPS remain unverified.")
    return results


def preview(pack, output):
    import numpy as np
    from PIL import Image, ImageDraw
    root = Path(pack).resolve() / "shaders"
    common = expand(root / "lib/common.glsl", root)
    fragment = "#version 120\n" + common + """
varying vec2 vUV;
void main(){
    float yaw=(vUV.x-.5)*3.6, elevation=mix(-.15,1.45,vUV.y);
    vec3 ray=vec3(sin(yaw)*cos(elevation),sin(elevation),-cos(yaw)*cos(elevation));
    vec3 x=skyRadiance(ray)*EXPOSURE;
    x=clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);
    gl_FragColor=vec4(pow(x,vec3(1./2.2)),1.);
}"""
    panel = Image.new("RGB", (1536, 280), "#111820"); labels = ImageDraw.Draw(panel)
    with HiddenContext() as ctx:
        renderer = Renderer(ctx, 512, 256); renderer.program(fragment)
        for index, (name, sun) in enumerate([("day", (.1, .85, -1)), ("sunset", (.1, .035, -1)), ("night", (.1, -.8, -1))]):
            renderer.sun(sun)
            rgb = np.array(renderer.draw()).reshape(256, 512, 4)[::-1, :, :3]
            panel.paste(Image.fromarray(np.rint(np.clip(rgb, 0, 1) * 255).astype(np.uint8)), (index * 512, 24))
            labels.text((index * 512 + 8, 7), name + " - synthetic GLSL sky preview (not Minecraft)", fill="white")
    panel.save(output)


if __name__ == "__main__":
    data = probe(sys.argv[1])
    if len(sys.argv) > 2: preview(sys.argv[1], sys.argv[2])
    sys.exit(int(any(value is False for value in data.values())))
