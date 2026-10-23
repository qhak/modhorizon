"""Compile/link a shader pack using a hidden Windows OpenGL compatibility context.

Usage: python scripts/shaders/check_glsl.py shader-foundations/aurora-horizon
Accepts either the pack directory or its shaders directory. Uses only Python's
standard library, opens no visible window, and does not attach to Minecraft.
This is raw compatibility-driver compilation, NOT Iris patcher, engine, buffer
routing, or rendered-appearance verification. Iris includes are expanded with
path/cycle guards. Explicit format-token preamble shims are reported; source is
otherwise compiled unchanged. Requires Windows with a working OpenGL driver.
"""

import ctypes as C
from ctypes import wintypes as W
from pathlib import Path
import re
import sys


class PixelFormat(C.Structure):
    _fields_ = [("size", W.WORD), ("version", W.WORD), ("flags", W.DWORD)] + [
        (name, C.c_ubyte) for name in (
            "pixelType", "colorBits", "redBits", "redShift", "greenBits",
            "greenShift", "blueBits", "blueShift", "alphaBits", "alphaShift",
            "accumBits", "accumRedBits", "accumGreenBits", "accumBlueBits",
            "accumAlphaBits", "depthBits", "stencilBits", "auxBuffers",
            "layerType", "reserved")
    ] + [(name, W.DWORD) for name in ("layerMask", "visibleMask", "damageMask")]


def prototype(lib, name, result, *args):
    fn = getattr(lib, name)
    fn.restype, fn.argtypes = result, list(args)
    return fn


class HiddenContext:
    def __init__(self):
        self.window = self.dc = self.context = None
        self.user = C.WinDLL("user32", use_last_error=True)
        self.gdi = C.WinDLL("gdi32", use_last_error=True)
        self.gl = C.WinDLL("opengl32", use_last_error=True)
        self.create_window = prototype(self.user, "CreateWindowExW", W.HWND,
            W.DWORD, W.LPCWSTR, W.LPCWSTR, W.DWORD,
            C.c_int, C.c_int, C.c_int, C.c_int, W.HWND, W.HMENU,
            W.HINSTANCE, C.c_void_p)
        self.get_dc = prototype(self.user, "GetDC", W.HDC, W.HWND)
        self.release_dc = prototype(self.user, "ReleaseDC", C.c_int, W.HWND, W.HDC)
        self.destroy_window = prototype(self.user, "DestroyWindow", W.BOOL, W.HWND)
        self.choose_format = prototype(self.gdi, "ChoosePixelFormat", C.c_int,
            W.HDC, C.POINTER(PixelFormat))
        self.set_format = prototype(self.gdi, "SetPixelFormat", W.BOOL,
            W.HDC, C.c_int, C.POINTER(PixelFormat))
        self.create_context = prototype(self.gl, "wglCreateContext", C.c_void_p, W.HDC)
        self.make_current = prototype(self.gl, "wglMakeCurrent", W.BOOL, W.HDC, C.c_void_p)
        self.delete_context = prototype(self.gl, "wglDeleteContext", W.BOOL, C.c_void_p)
        self.get_proc = prototype(self.gl, "wglGetProcAddress", C.c_void_p, C.c_char_p)

    def __enter__(self):
        try:
            # Style zero deliberately excludes WS_VISIBLE. Never call ShowWindow.
            self.window = self.create_window(0, "STATIC", "Shader compiler (hidden)",
                0, 0, 0, 1, 1, None, None, None, None)
            if not self.window:
                raise C.WinError(C.get_last_error())
            self.dc = self.get_dc(self.window)
            p = PixelFormat()
            p.size, p.version, p.flags = C.sizeof(p), 1, 0x25
            p.colorBits, p.depthBits, p.stencilBits = 32, 24, 8
            chosen = self.choose_format(self.dc, C.byref(p))
            if not chosen or not self.set_format(self.dc, chosen, C.byref(p)):
                raise RuntimeError("Cannot configure OpenGL pixel format")
            self.context = self.create_context(self.dc)
            if not self.context or not self.make_current(self.dc, self.context):
                raise RuntimeError("Cannot create/make current OpenGL context")
            return self
        except BaseException:
            self.close()
            raise

    def function(self, name, result, *args):
        address = self.get_proc(name.encode("ascii"))
        if address in (None, 0, 1, 2, 3, C.c_void_p(-1).value):
            raise RuntimeError("Missing OpenGL function: " + name)
        return C.WINFUNCTYPE(result, *args)(address)

    def close(self):
        if self.context:
            self.make_current(None, None)
            self.delete_context(self.context)
            self.context = None
        if self.dc:
            self.release_dc(self.window, self.dc)
            self.dc = None
        if self.window:
            self.destroy_window(self.window)
            self.window = None

    def __exit__(self, *_):
        self.close()


INCLUDE = re.compile(r'^\s*#\s*include\s+"([^"]+)"\s*(?://.*)?$')
FORMATS = {"RGBA8": 0x8058, "RGBA16F": 0x881A, "RGBA32F": 0x8814,
    "RGB8": 0x8051, "RGB16F": 0x881B, "RGB32F": 0x8815,
    "RG8": 0x822B, "RG16F": 0x822F, "RG32F": 0x8230,
    "R8": 0x8229, "R16F": 0x822D, "R32F": 0x822E}


def expand(path, root, chain=()):
    path = path.resolve()
    if not path.is_relative_to(root):
        raise ValueError("Include escapes shaders directory: " + str(path))
    if path in chain:
        raise ValueError("Include cycle: " + " -> ".join(p.name for p in (*chain, path)))
    if not path.is_file():
        raise ValueError("Missing shader source/include: " + str(path))
    result = []
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        match = INCLUDE.match(line)
        if match:
            name = match.group(1)
            included = root / name[1:] if name.startswith("/") else path.parent / name
            result.append(expand(included, root, (*chain, path)))
        else:
            result.append(line)
    return "\n".join(result) + "\n"


def source_with_shims(source, label):
    # Iris parses these symbolic const-int format assignments independently.
    needed = sorted(set(re.findall(r'\b\w+Format\s*=\s*([A-Z][A-Z0-9_]*)\s*;', source)))
    shims = [name for name in needed if name in FORMATS and not
        re.search(r'^\s*#\s*define\s+' + re.escape(name) + r'\b', source, re.M)]
    if not shims:
        return source
    lines = source.splitlines(keepends=True)
    version = next((i for i, line in enumerate(lines) if re.match(r'^\s*#\s*version\b', line)), None)
    insertion = version + 1 if version is not None else 0
    lines[insertion:insertion] = [f"#define {name} {FORMATS[name]}\n" for name in shims]
    print(f"  Preamble shims {label}: {', '.join(shims)}")
    return "".join(lines)


def check(root):
    failures, stages, programs = 0, 0, 0
    with HiddenContext() as ctx:
        get_string = prototype(ctx.gl, "glGetString", C.c_char_p, C.c_uint)
        for label, token in (("Driver", 0x1F02), ("Renderer", 0x1F01), ("GLSL", 0x8B8C)):
            print(label + ": " + (get_string(token) or b"unknown").decode())
        create = ctx.function("glCreateShader", C.c_uint, C.c_uint)
        set_source = ctx.function("glShaderSource", None, C.c_uint, C.c_int,
            C.POINTER(C.c_char_p), C.POINTER(C.c_int))
        compile_shader = ctx.function("glCompileShader", None, C.c_uint)
        shader_status = ctx.function("glGetShaderiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        shader_log = ctx.function("glGetShaderInfoLog", None, C.c_uint, C.c_int,
            C.POINTER(C.c_int), C.c_void_p)
        delete_shader = ctx.function("glDeleteShader", None, C.c_uint)
        create_program = ctx.function("glCreateProgram", C.c_uint)
        attach = ctx.function("glAttachShader", None, C.c_uint, C.c_uint)
        link = ctx.function("glLinkProgram", None, C.c_uint)
        program_status = ctx.function("glGetProgramiv", None, C.c_uint, C.c_uint, C.POINTER(C.c_int))
        program_log = ctx.function("glGetProgramInfoLog", None, C.c_uint, C.c_int,
            C.POINTER(C.c_int), C.c_void_p)
        delete_program = ctx.function("glDeleteProgram", None, C.c_uint)

        def status_and_log(handle, status_fn, log_fn, token):
            status, length = C.c_int(), C.c_int()
            status_fn(handle, token, C.byref(status))
            status_fn(handle, 0x8B84, C.byref(length))
            if length.value > 1:
                buffer = C.create_string_buffer(length.value)
                log_fn(handle, length.value, None, buffer)
                print(buffer.value.decode("utf-8", errors="replace").rstrip())
            return bool(status.value)

        stems = sorted({p.with_suffix("") for p in root.rglob("*") if p.suffix in (".vsh", ".fsh")})
        if not stems:
            raise ValueError("No .vsh/.fsh stages found")
        for stem in stems:
            shaders, program, good = [], None, True
            print("Program: " + str(stem.relative_to(root)))
            try:
                for suffix, token in ((".vsh", 0x8B31), (".fsh", 0x8B30)):
                    path = stem.with_suffix(suffix)
                    source = source_with_shims(expand(path, root), path.name).encode("utf-8")
                    shader = create(token)
                    shaders.append(shader)
                    pointer, length = C.c_char_p(source), C.c_int(len(source))
                    set_source(shader, 1, C.byref(pointer), C.byref(length))
                    compile_shader(shader)
                    stages += 1
                    ok = status_and_log(shader, shader_status, shader_log, 0x8B81)
                    print("  " + path.name + (": PASS" if ok else ": FAIL"))
                    good = good and ok
                if good:
                    program = create_program()
                    for shader in shaders:
                        attach(program, shader)
                    link(program)
                    programs += 1
                    good = status_and_log(program, program_status, program_log, 0x8B82)
                    print("  Link: " + ("PASS" if good else "FAIL"))
                if not good:
                    failures += 1
            except (ValueError, OSError) as exc:
                print("  FAIL: " + str(exc))
                failures += 1
            finally:
                if program:
                    delete_program(program)
                for shader in shaders:
                    delete_shader(shader)
    print(f"Compiled {stages} stages; linked {programs} programs; {failures} failed programs.")
    print("Raw driver check only; Iris integration and visual quality remain unverified.")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        if sys.platform != "win32":
            raise ValueError("This harness requires Windows")
        if len(sys.argv) != 2:
            raise ValueError("Usage: check_glsl.py <shader-pack-or-shaders-directory>")
        target = Path(sys.argv[1]).resolve()
        if (target / "shaders").is_dir():
            target = target / "shaders"
        if not target.is_dir():
            raise ValueError("Shader directory does not exist: " + str(target))
        sys.exit(check(target))
    except (ValueError, OSError, RuntimeError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        sys.exit(1)
