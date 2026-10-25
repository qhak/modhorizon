"""Render synthetic celestial texels with a pack's actual fragment/blend contract.

Hidden one-pixel driver check, not Minecraft/Iris visual acceptance.
Usage: python probe_celestial.py <pack-directory>
"""
import ctypes as C
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from check_glsl import HiddenContext, expand, prototype


def probe(root):
    root = Path(root).resolve() / "shaders"
    line = next(line for line in (root / "shaders.properties").read_text(encoding="utf-8").splitlines()
                if line.startswith("blend.gbuffers_skytextured="))
    factors = {"ZERO": 0, "ONE": 1, "SRC_ALPHA": 0x302, "ONE_MINUS_SRC_ALPHA": 0x303}
    blend = [factors[token] for token in line.split("=", 1)[1].split()]
    if len(blend) != 4:
        raise ValueError("Probe requires four explicit blend factors")
    vertex = "#version 120\nvarying vec2 vUV; varying vec4 vColour; void main(){gl_Position=gl_Vertex;vUV=vec2(0.5);vColour=vec4(1.0);}"
    fragment = expand(root / "gbuffers_skytextured.fsh", root)
    with HiddenContext() as ctx:
        # A hidden window can have clipped default buffers; render offscreen.
        framebuffer, renderbuffer = C.c_uint(), C.c_uint()
        ctx.function("glGenFramebuffers", None, C.c_int, C.POINTER(C.c_uint))(1, C.byref(framebuffer))
        ctx.function("glBindFramebuffer", None, C.c_uint, C.c_uint)(0x8D40, framebuffer.value)
        ctx.function("glGenRenderbuffers", None, C.c_int, C.POINTER(C.c_uint))(1, C.byref(renderbuffer))
        ctx.function("glBindRenderbuffer", None, C.c_uint, C.c_uint)(0x8D41, renderbuffer.value)
        ctx.function("glRenderbufferStorage", None, C.c_uint, C.c_uint, C.c_int, C.c_int)(0x8D41, 0x8814, 1, 1)
        ctx.function("glFramebufferRenderbuffer", None, C.c_uint, C.c_uint, C.c_uint, C.c_uint)(0x8D40, 0x8CE0, 0x8D41, renderbuffer.value)
        if ctx.function("glCheckFramebufferStatus", C.c_uint, C.c_uint)(0x8D40) != 0x8CD5:
            raise RuntimeError("Offscreen framebuffer incomplete")
        prototype(ctx.gl, "glDrawBuffer", None, C.c_uint)(0x8CE0)
        prototype(ctx.gl, "glReadBuffer", None, C.c_uint)(0x8CE0)
        create = ctx.function("glCreateShader", C.c_uint, C.c_uint)
        source = ctx.function("glShaderSource", None, C.c_uint, C.c_int, C.POINTER(C.c_char_p), C.POINTER(C.c_int))
        compile_shader = ctx.function("glCompileShader", None, C.c_uint)
        shader_status = ctx.function("glGetShaderiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        shaders = []
        for text, kind in [(vertex, 0x8B31), (fragment, 0x8B30)]:
            shader = create(kind)
            shaders.append(shader)
            data = text.encode("utf-8")
            pointer, length = C.c_char_p(data), C.c_int(len(data))
            source(shader, 1, C.byref(pointer), C.byref(length))
            compile_shader(shader)
            ok = C.c_int()
            shader_status(shader, 0x8B81, C.byref(ok))
            if not ok.value:
                raise RuntimeError("Probe stage failed compilation; run check_glsl.py for details")
        create_program = ctx.function("glCreateProgram", C.c_uint)
        attach = ctx.function("glAttachShader", None, C.c_uint, C.c_uint)
        link = ctx.function("glLinkProgram", None, C.c_uint)
        program_status = ctx.function("glGetProgramiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        program = create_program()
        for shader in shaders:
            attach(program, shader)
        link(program)
        ok = C.c_int()
        program_status(program, 0x8B82, C.byref(ok))
        if not ok.value:
            raise RuntimeError("Probe program failed linking")
        ctx.function("glUseProgram", None, C.c_uint)(program)
        location = ctx.function("glGetUniformLocation", C.c_int, C.c_uint, C.c_char_p)(program, b"texture")
        ctx.function("glUniform1i", None, C.c_int, C.c_int)(location, 0)
        texture = C.c_uint()
        prototype(ctx.gl, "glGenTextures", None, C.c_int, C.POINTER(C.c_uint))(1, C.byref(texture))
        prototype(ctx.gl, "glBindTexture", None, C.c_uint, C.c_uint)(0x0DE1, texture)
        parameter = prototype(ctx.gl, "glTexParameteri", None, C.c_uint, C.c_uint, C.c_int)
        parameter(0x0DE1, 0x2801, 0x2600)
        parameter(0x0DE1, 0x2800, 0x2600)
        image = prototype(ctx.gl, "glTexImage2D", None, C.c_uint, C.c_int, C.c_int, C.c_int, C.c_int, C.c_int, C.c_uint, C.c_uint, C.c_void_p)
        prototype(ctx.gl, "glEnable", None, C.c_uint)(0x0BE2)
        ctx.function("glBlendFuncSeparate", None, C.c_uint, C.c_uint, C.c_uint, C.c_uint)(*blend)
        prototype(ctx.gl, "glViewport", None, C.c_int, C.c_int, C.c_int, C.c_int)(0, 0, 1, 1)
        clear_colour = prototype(ctx.gl, "glClearColor", None, C.c_float, C.c_float, C.c_float, C.c_float)
        clear = prototype(ctx.gl, "glClear", None, C.c_uint)
        begin = prototype(ctx.gl, "glBegin", None, C.c_uint)
        vertex_fn = prototype(ctx.gl, "glVertex2f", None, C.c_float, C.c_float)
        end = prototype(ctx.gl, "glEnd", None)
        read = prototype(ctx.gl, "glReadPixels", None, C.c_int, C.c_int, C.c_int, C.c_int, C.c_uint, C.c_uint, C.c_void_p)
        background = (0.15, 0.25, 0.40)
        cases = [
            ("opaque black border", (0, 0, 0, 1), background),
            ("dark celestial halo", (0.03, 0.03, 0.03, 1), (0.18, 0.28, 0.43)),
            ("lit sun texel", (0.4, 0.2, 0.1, 1), (0.55, 0.45, 0.50)),
            ("alpha faded texel", (0.4, 0.2, 0.1, 0.5), (0.35, 0.35, 0.45)),
            ("fully transparent texel", (0.8, 0.8, 0.8, 0), background),
        ]
        failures = 0
        for label, rgba, expected in cases:
            pixel = (C.c_float * 4)(*rgba)
            image(0x0DE1, 0, 0x8058, 1, 1, 0, 0x1908, 0x1406, pixel)
            clear_colour(*background, 1.0)
            clear(0x4000)
            begin(5)
            for point in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
                vertex_fn(*point)
            end()
            result = (C.c_float * 4)()
            read(0, 0, 1, 1, 0x1908, 0x1406, result)
            error = prototype(ctx.gl, "glGetError", C.c_uint)()
            if error:
                raise RuntimeError("OpenGL error: " + hex(error))
            passed = all(abs(result[i] - expected[i]) < 0.015 for i in range(3)) and abs(result[3] - 1.0) < 0.015
            failures += not passed
            print(label, "PASS" if passed else "FAIL", tuple(round(result[i], 3) for i in range(3)))
        print("Synthetic native RGB blending only; Iris stage routing and full scene appearance remain unverified.")
        return int(bool(failures))


if __name__ == "__main__":
    sys.exit(probe(sys.argv[1]))
