"""Native-driver regression for the RGBA16F error that the old shim masked."""
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest

sys.dont_write_bytecode = True
REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "scripts" / "shaders"))
if sys.platform == "win32":
    from check_glsl import check


@unittest.skipUnless(sys.platform == "win32", "Requires a native Windows OpenGL driver")
class FormatMetadataRegression(unittest.TestCase):
    def compile_case(self, metadata):
        with TemporaryDirectory(prefix=".shader-driver-test-", dir=REPO) as folder:
            root = Path(folder).resolve()
            self.assertTrue(root.is_relative_to(REPO))
            (root / "composite.vsh").write_text(
                "#version 120\nvoid main() { gl_Position = gl_Vertex; }\n", encoding="utf-8")
            (root / "composite.fsh").write_text(
                "#version 120\n" + metadata + "\nvoid main() { gl_FragColor = vec4(1.0); }\n", encoding="utf-8")
            output = StringIO()
            with redirect_stdout(output):
                result = check(root)
            return result, output.getvalue()

    def test_undefined_format_is_not_silently_defined(self):
        result, log = self.compile_case("const int colortex0Format = RGBA16F;")
        self.assertNotEqual(result, 0)
        self.assertIn("RGBA16F", log)

    def test_iris_block_comment_is_valid_unmodified_glsl(self):
        result, log = self.compile_case("/*\nconst int colortex0Format = RGBA16F;\n*/")
        self.assertEqual(result, 0, log)


if __name__ == "__main__":
    unittest.main()
