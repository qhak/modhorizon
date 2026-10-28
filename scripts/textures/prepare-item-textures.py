"""Reproduce the five fixed vanilla tool bases; no generated URLs are accepted.

Usage: python scripts/textures/prepare-item-textures.py [--client-jar PATH]
Without a local JAR, downloads the hash-pinned official Minecraft 1.21.4 client.
Only the five selected 16x16 images are extracted into compact source data.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import urllib.request
import zipfile
import io
import zlib

VERSION = "1.21.4"
SHA1 = "a7e5a6024bfd3cd614625aa05629adf760020304"
URL = f"https://piston-data.mojang.com/v1/objects/{SHA1}/client.jar"
NAMES = ["diamond_sword", "diamond_pickaxe", "diamond_axe", "diamond_shovel", "diamond_hoe"]


def decode_indexed(png):
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    offset, data = 8, b""
    palette, alpha = b"", b""
    while offset < len(png):
        length = struct.unpack(">I", png[offset:offset+4])[0]
        kind = png[offset+4:offset+8]
        payload = png[offset+8:offset+8+length]
        assert zlib.crc32(kind + payload) & 0xffffffff == struct.unpack(">I", png[offset+8+length:offset+12+length])[0]
        if kind == b"IHDR":
            w, h, depth, color, comp, filt, interlace = struct.unpack(">IIBBBBB", payload)
            assert (w, h, color, comp, filt, interlace) == (16, 16, 3, 0, 0, 0)
            assert depth in (4, 8)
        elif kind == b"PLTE":
            palette = payload
        elif kind == b"tRNS":
            alpha = payload
        elif kind == b"IDAT":
            data += payload
        offset += length + 12
    packed = zlib.decompress(data)
    stride = (w * depth + 7) // 8
    pixels, prior = [], [0] * stride
    for y in range(h):
        start = y * (stride + 1)
        filter_type = packed[start]
        row = list(packed[start+1:start+1+stride])
        for x in range(stride):
            left, up, corner = row[x-1] if x else 0, prior[x], prior[x-1] if x else 0
            if filter_type == 1:
                row[x] = (row[x] + left) & 255
            elif filter_type == 2:
                row[x] = (row[x] + up) & 255
            elif filter_type == 3:
                row[x] = (row[x] + (left + up)//2) & 255
            elif filter_type == 4:
                p = left + up - corner
                choices = [left, up, corner]
                predictor = min(choices, key=lambda value: abs(p-value))
                row[x] = (row[x] + predictor) & 255
            else:
                assert filter_type == 0
        prior = row
        pixels.extend(row if depth == 8 else [v for byte in row for v in (byte >> 4, byte & 15)])
    colors = [list(palette[i:i+3]) + [alpha[i//3] if i//3 < len(alpha) else 255] for i in range(0, len(palette), 3)]
    # Diamond cyan and its teal outline; brown wooden handles remain untouched.
    mask = [i for i, (r, g, b, a) in enumerate(colors) if a and g > r * 1.15 and b > r * 1.15]
    assert mask and len(pixels) == 256
    return {"palette": colors, "pixels": "".join(f"{i:02x}" for i in pixels), "diamondPalette": mask,
            "pngSha256": hashlib.sha256(png).hexdigest()}


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--client-jar", type=Path)
    parsed = args.parse_args()
    client = parsed.client_jar.read_bytes() if parsed.client_jar else urllib.request.urlopen(URL, timeout=90).read()
    assert hashlib.sha1(client).hexdigest() == SHA1, "Client JAR does not match pinned official 1.21.4 SHA1"
    with zipfile.ZipFile(io.BytesIO(client)) as archive:
        textures = {name: decode_indexed(archive.read(f"assets/minecraft/textures/item/{name}.png")) for name in NAMES}
    provenance = {"version": VERSION, "url": URL, "clientSha1": SHA1,
                  "generator": "scripts/textures/prepare-item-textures.py", "textures": textures}
    output = Path(__file__).resolve().parents[2] / "src/lib/item-texture-bases.ts"
    output.write_text("// Generated from hash-pinned official Minecraft assets. Do not edit by hand.\n"
                      "// Minecraft artwork belongs to Mojang/Microsoft; these are limited compatibility bases.\n"
                      "export const ITEM_TEXTURE_BASES = " + json.dumps(provenance, indent=2) + " as const;\n", encoding="utf-8")
    print(f"Wrote {len(textures)} verified 16x16 tool bases to {output}")


if __name__ == "__main__":
    main()
