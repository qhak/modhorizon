"""Reproduce both authored OreGlow ZIPs; no provider calls or deployment."""
from pathlib import Path
import io
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent/'outputs'
node = shutil.which('node')
if not node: raise SystemExit('Node.js is required')
tsx = ROOT/'node_modules/tsx/dist/cli.mjs'
subprocess.run([sys.executable, str(ROOT/'scripts/shaders/build-ore-glow.py')], cwd=ROOT, check=True)
subprocess.run([node, str(tsx), 'scripts/shaders/package-ore-glow.ts', str(output/'OreGlow-test01.zip')], cwd=ROOT, check=True)
materials = ROOT/'.data/ore-glow-materials-test01'
subprocess.run([node, str(tsx), 'scripts/textures/build-ore-glow-materials.ts', str(materials), '1.21.4'], cwd=ROOT, check=True)
files = sorted(p for p in materials.rglob('*') if p.is_file())
assert len(files) == 39, 'Unexpected companion pack entries; inspect the material staging folder'
archive = io.BytesIO()
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in files:
        info = zipfile.ZipInfo(p.relative_to(materials).as_posix(), date_time=(1980,1,1,0,0,0))
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, p.read_bytes())
data = archive.getvalue()
with zipfile.ZipFile(io.BytesIO(data)) as z:
    for p in files: assert z.read(p.relative_to(materials).as_posix()) == p.read_bytes()
target = output/'OreGlowMaterials-test01.zip'
output.mkdir(parents=True, exist_ok=True)
if target.exists() and target.read_bytes() != data:
    raise SystemExit('Preserve existing candidates: choose another output folder')
target.write_bytes(data)
print(f'Verified companion ZIP: {target} ({len(files)} files)')
