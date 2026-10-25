"""Synthetic hidden GPU lighting probe; not Iris integration or visual fidelity.

Usage: python scripts/shaders/probe_lighting.py shader-foundations/aurora-horizon
Compiles the actual lighting include (and its common include), supplies identity
matrices, deterministic normals/lightmap coordinates, and constant shadow maps.
Renders one pixel per case on the native compatibility driver. Tests directional
lighting, direct-light occlusion, retained blocklight, bounded material response,
and terrain metal/stone highlights with shadow attenuation. Pins the five approved
general/water lighting outputs to catch unintended baseline changes. No visible windows,
Minecraft interaction, third-party modules or downloaded compiler are required.
"""
import ctypes as C
import math
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from check_glsl import HiddenContext, expand, prototype


def probe(root):
    with HiddenContext() as ctx:
        get_string = prototype(ctx.gl, "glGetString", C.c_char_p, C.c_uint)
        print("Synthetic lighting probe: " + get_string(0x1F01).decode())
        create = ctx.function("glCreateShader", C.c_uint, C.c_uint)
        source_fn = ctx.function("glShaderSource", None, C.c_uint, C.c_int, C.POINTER(C.c_char_p), C.POINTER(C.c_int))
        compile_fn = ctx.function("glCompileShader", None, C.c_uint)
        shader_iv = ctx.function("glGetShaderiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        shader_log = ctx.function("glGetShaderInfoLog", None, C.c_uint, C.c_int, C.POINTER(C.c_int), C.c_void_p)
        delete_shader = ctx.function("glDeleteShader", None, C.c_uint)
        create_program = ctx.function("glCreateProgram", C.c_uint)
        attach = ctx.function("glAttachShader", None, C.c_uint, C.c_uint)
        link = ctx.function("glLinkProgram", None, C.c_uint)
        program_iv = ctx.function("glGetProgramiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        program_log = ctx.function("glGetProgramInfoLog", None, C.c_uint, C.c_int, C.POINTER(C.c_int), C.c_void_p)
        delete_program = ctx.function("glDeleteProgram", None, C.c_uint)
        use = ctx.function("glUseProgram", None, C.c_uint)
        location = ctx.function("glGetUniformLocation", C.c_int, C.c_uint, C.c_char_p)
        uniform3 = ctx.function("glUniform3f", None, C.c_int, C.c_float, C.c_float, C.c_float)
        uniform2 = ctx.function("glUniform2f", None, C.c_int, C.c_float, C.c_float)
        uniform1i = ctx.function("glUniform1i", None, C.c_int, C.c_int)
        uniform1f = ctx.function("glUniform1f", None, C.c_int, C.c_float)
        matrix = ctx.function("glUniformMatrix4fv", None, C.c_int, C.c_int, C.c_ubyte, C.POINTER(C.c_float))
        bind_texture = prototype(ctx.gl, "glBindTexture", None, C.c_uint, C.c_uint)
        gen_texture = prototype(ctx.gl, "glGenTextures", None, C.c_int, C.POINTER(C.c_uint))
        del_texture = prototype(ctx.gl, "glDeleteTextures", None, C.c_int, C.POINTER(C.c_uint))
        tex_parameter = prototype(ctx.gl, "glTexParameteri", None, C.c_uint, C.c_uint, C.c_int)
        tex_image = prototype(ctx.gl, "glTexImage2D", None, C.c_uint, C.c_int, C.c_int,
            C.c_int, C.c_int, C.c_int, C.c_uint, C.c_uint, C.c_void_p)
        viewport = prototype(ctx.gl, "glViewport", None, C.c_int, C.c_int, C.c_int, C.c_int)
        disable = prototype(ctx.gl, "glDisable", None, C.c_uint)
        begin = prototype(ctx.gl, "glBegin", None, C.c_uint)
        vertex = prototype(ctx.gl, "glVertex2f", None, C.c_float, C.c_float)
        end = prototype(ctx.gl, "glEnd", None)
        read = prototype(ctx.gl, "glReadPixels", None, C.c_int, C.c_int, C.c_int, C.c_int,
            C.c_uint, C.c_uint, C.c_void_p)
        finish = prototype(ctx.gl, "glFinish", None)
        error = prototype(ctx.gl, "glGetError", C.c_uint)
        gen_fbo = ctx.function("glGenFramebuffers", None, C.c_int, C.POINTER(C.c_uint))
        bind_fbo = ctx.function("glBindFramebuffer", None, C.c_uint, C.c_uint)
        del_fbo = ctx.function("glDeleteFramebuffers", None, C.c_int, C.POINTER(C.c_uint))
        gen_rbo = ctx.function("glGenRenderbuffers", None, C.c_int, C.POINTER(C.c_uint))
        bind_rbo = ctx.function("glBindRenderbuffer", None, C.c_uint, C.c_uint)
        storage = ctx.function("glRenderbufferStorage", None, C.c_uint, C.c_uint, C.c_int, C.c_int)
        attach_rbo = ctx.function("glFramebufferRenderbuffer", None, C.c_uint, C.c_uint, C.c_uint, C.c_uint)
        fbo_status = ctx.function("glCheckFramebufferStatus", C.c_uint, C.c_uint)
        del_rbo = ctx.function("glDeleteRenderbuffers", None, C.c_int, C.POINTER(C.c_uint))
        draw_buffer = prototype(ctx.gl, "glDrawBuffer", None, C.c_uint)
        read_buffer = prototype(ctx.gl, "glReadBuffer", None, C.c_uint)

        shaders, program, texture = [], 0, C.c_uint()
        framebuffer, renderbuffer = C.c_uint(), C.c_uint()
        try:
            # Hidden window default buffers can be clipped. Use an offscreen FBO.
            gen_fbo(1, C.byref(framebuffer))
            bind_fbo(0x8D40, framebuffer.value)
            gen_rbo(1, C.byref(renderbuffer))
            bind_rbo(0x8D41, renderbuffer.value)
            storage(0x8D41, 0x8814, 1, 1)  # RGBA32F avoids quantizing subtle light.
            attach_rbo(0x8D40, 0x8CE0, 0x8D41, renderbuffer.value)
            if fbo_status(0x8D40) != 0x8CD5:
                raise RuntimeError("Offscreen framebuffer incomplete")
            draw_buffer(0x8CE0)
            read_buffer(0x8CE0)
            texts = [(0x8B31, "#version 120\nvoid main(){gl_Position=gl_Vertex;}\n"),
                (0x8B30, "#version 120\n" + expand(root / "lib/lighting.glsl", root) + "\n"
                 "uniform vec3 probeNormal; uniform vec2 probeLm; uniform int probeMode; uniform float probeMaterial;\n"
                 "void main(){vec3 c=lightSurface(vec3(0.3),probeNormal,vec3(0.0),probeLm,1.0,1.0);"
                 "if(probeMode>0){vec2 r=terrainMaterialResponse(probeMaterial).xy;"
                 "if(probeMode==1)c=vec3(r,0.0);"
                 "if(probeMode==2)c=terrainHighlight(vec3(0.3),vec3(0,1,0),vec3(0,1,0),vec3(0,1,0),r.x,r.y);"
                 "if(probeMode==3||probeMode==4){"
                 "c=lightTerrainMaterial(vec3(0.3),vec3(0,1,0),vec3(0,1,0),vec3(0,-0.25,0),probeLm,1.0,probeMaterial);"
                 "if(probeMode==4)c-=lightSurface(vec3(0.3)*(1.0-r.y*0.55),vec3(0,1,0),vec3(0,-0.25,0),probeLm,1.0,1.0);}}"
                 "gl_FragColor=vec4(c*0.25,1.0);}\n")]
            for kind, text in texts:
                shader = create(kind)
                shaders.append(shader)
                src = C.c_char_p(text.encode())
                source_fn(shader, 1, C.byref(src), None)
                compile_fn(shader)
                ok = C.c_int()
                shader_iv(shader, 0x8B81, C.byref(ok))
                if not ok.value:
                    log = C.create_string_buffer(32768)
                    shader_log(shader, len(log), None, log)
                    raise RuntimeError(log.value.decode())
            program = create_program()
            for shader in shaders:
                attach(program, shader)
            link(program)
            ok = C.c_int()
            program_iv(program, 0x8B82, C.byref(ok))
            if not ok.value:
                log = C.create_string_buffer(32768)
                program_log(program, len(log), None, log)
                raise RuntimeError(log.value.decode())
            use(program)
            loc = lambda name: location(program, name.encode())
            identity = (C.c_float * 16)(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)
            for name in ("gbufferModelViewInverse", "shadowModelView", "shadowProjection"):
                matrix(loc(name), 1, 0, identity)
            uniform3(loc("sunPosition"), 0, 1, 0)
            uniform3(loc("shadowLightPosition"), 0, 1, 0)
            uniform1f(loc("rainStrength"), 0)
            uniform1i(loc("shadowtex0"), 0)
            gen_texture(1, C.byref(texture))
            bind_texture(0x0DE1, texture.value)
            for name, value in ((0x2801, 0x2600), (0x2800, 0x2600), (0x2802, 0x812F), (0x2803, 0x812F)):
                tex_parameter(0x0DE1, name, value)
            viewport(0, 0, 1, 1)
            for token in (0x0B71, 0x0BE2, 0x0B44, 0x0BD0):
                disable(token)

            def sample(normal, lightmap, shadow, mode=0, material=1003):
                pixel = (C.c_ubyte * 4)(shadow, shadow, shadow, 255)
                tex_image(0x0DE1, 0, 0x8058, 1, 1, 0, 0x1908, 0x1401, pixel)
                uniform3(loc("probeNormal"), *normal)
                uniform2(loc("probeLm"), *lightmap)
                uniform1i(loc("probeMode"), mode)
                uniform1f(loc("probeMaterial"), material)
                begin(0x0007)
                for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    vertex(x, y)
                end()
                finish()
                rgb = (C.c_float * 3)()
                read(0, 0, 1, 1, 0x1907, 0x1406, rgb)
                err = error()
                if err:
                    raise RuntimeError(f"OpenGL error {err:#x}")
                result = tuple(round(v, 6) for v in rgb)
                return result, sum(rgb) / 3

            cases = {
                "sun-facing lit": sample((0, 1, 0), (0.03125, 0.96875), 255),
                "reverse-facing lit": sample((0, -1, 0), (0.03125, 0.96875), 255),
                "sun-facing occluded": sample((0, 1, 0), (0.03125, 0.96875), 0),
                "dark without blocklight": sample((0, 1, 0), (0.03125, 0.03125), 0),
                "dark with blocklight": sample((0, 1, 0), (0.96875, 0.03125), 0),
            }
            for name, (rgb, _) in cases.items():
                print(f"  {name}: RGB={rgb}")
            assert cases["sun-facing lit"][1] > cases["reverse-facing lit"][1] + 0.05, "Directional illumination failed"
            assert cases["sun-facing lit"][1] > cases["sun-facing occluded"][1] + 0.05, "Shadow attenuation failed"
            assert cases["dark with blocklight"][1] > cases["dark without blocklight"][1] + 0.02, "Blocklight retention failed"
            expected = {
                "sun-facing lit": (.25098, .2445, .22314),
                "reverse-facing lit": (.00594, .0075, .01002),
                "sun-facing occluded": (.01098, .0141, .01914),
                "dark without blocklight": (.001505, .001692, .001994),
                "dark with blocklight": (.234005, .113292, .036869),
            }
            for name, rgb in expected.items():
                assert max(abs(a-b) for a, b in zip(cases[name][0], rgb)) < .00001, "Approved baseline changed: " + name
            print("PASS: directional illumination, shadow attenuation, retained blocklight.")
            print("PASS: all five approved water/general lighting baseline values unchanged.")
            normal, full_sky = (0, 1, 0), (.03125, .96875)
            for material in (0, 1003, 1004, 1005, 1006, 1007):
                rgb, _ = sample(normal, full_sky, 255, 1, material)
                roughness, metallic = rgb[0]*4, rgb[1]*4
                assert all(math.isfinite(v) for v in rgb), "Nonfinite material response"
                assert 0 < roughness <= 1 and 0 <= metallic <= 1, "Material response outside valid bounds"
                print(f"  Material {material}: roughness={roughness:.5f}, metallic={metallic:.5f}")
            stone = sample(normal, full_sky, 255, 2, 1003)
            metal = sample(normal, full_sky, 255, 2, 1005)
            assert all(math.isfinite(v) for v in (*stone[0], *metal[0])), "Nonfinite highlight"
            assert metal[1] > stone[1] + .01, "Metal highlight did not exceed rough stone at fixed aligned view/light"
            print(f"  Fixed-view highlight stone={stone[0]}, metal={metal[0]}")
            highlight_lit = sample(normal, full_sky, 255, 4, 1005)
            highlight_shadow = sample(normal, full_sky, 0, 4, 1005)
            ambient = sample(normal, full_sky, 0, 3, 1005)
            torch = sample(normal, (.96875, .03125), 0, 3, 1005)
            no_torch = sample(normal, (.03125, .03125), 0, 3, 1005)
            assert all(math.isfinite(v) for values in (highlight_lit, highlight_shadow, ambient, torch, no_torch) for v in values[0]), "Nonfinite terrain lighting"
            assert highlight_lit[1] > .01, "Lit terrain highlight missing"
            assert max(abs(v) for v in highlight_shadow[0]) < .00001, "Direct highlight persisted under full shadow"
            assert ambient[1] > .001, "Ambient terrain illumination vanished in shadow"
            assert torch[1] > no_torch[1] + .02, "Terrain blocklight vanished in shadow"
            print(f"  Terrain highlight lit={highlight_lit[0]}, shadow={highlight_shadow[0]}")
            print(f"  Shadowed terrain ambient={ambient[0]}, torch={torch[0]}")
            print("PASS: finite material response, metal/stone distinction, shadowed direct-highlight removal, ambient/torch retention.")
            print("Synthetic math/driver test only; not Iris integration or visual fidelity.")
        finally:
            use(0)
            bind_fbo(0x8D40, 0)
            if renderbuffer.value:
                del_rbo(1, C.byref(renderbuffer))
            if framebuffer.value:
                del_fbo(1, C.byref(framebuffer))
            if texture.value:
                del_texture(1, C.byref(texture))
            if program:
                delete_program(program)
            for shader in shaders:
                delete_shader(shader)


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2 or sys.platform != "win32":
            raise ValueError("Usage on Windows: probe_lighting.py <shader-pack-or-shaders-directory>")
        root = Path(sys.argv[1]).resolve()
        if (root / "shaders").is_dir():
            root /= "shaders"
        probe(root)
    except (ValueError, RuntimeError, OSError, AssertionError) as exc:
        print("FAIL: " + str(exc), file=sys.stderr)
        sys.exit(1)
