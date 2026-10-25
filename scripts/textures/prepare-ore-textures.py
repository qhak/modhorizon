"""Reproduce fixed ore bases from a hash-pinned official Minecraft 1.21.4 client.

Only vanilla artwork is extracted. Masks select visible mineral patches rather
than inventing hidden ores; shader-free output never changes lighting or opacity.
Usage: python scripts/textures/prepare-ore-textures.py [--client-jar PATH]
"""
import argparse
import hashlib
import io
import json
from pathlib import Path
import struct
import urllib.request
import zipfile
import zlib

SHA1 = "a7e5a6024bfd3cd614625aa05629adf760020304"
URL = f"https://piston-data.mojang.com/v1/objects/{SHA1}/client.jar"
MINERALS = ["coal", "iron", "copper", "gold", "redstone", "emerald", "lapis", "diamond"]
NAMES = [m + "_ore" for m in MINERALS] + ["deepslate_" + m + "_ore" for m in MINERALS] + ["nether_gold_ore", "nether_quartz_ore"]


def decode(png):
    assert png[:8] == b"\x89PNG\r\n\x1a\n"
    offset, data, palette = 8, b"", b""
    while offset < len(png):
        length = struct.unpack(">I", png[offset:offset+4])[0]
        kind, payload = png[offset+4:offset+8], png[offset+8:offset+8+length]
        assert zlib.crc32(kind + payload) & 0xffffffff == struct.unpack(">I", png[offset+8+length:offset+12+length])[0]
        if kind == b"IHDR":
            w, h, depth, color, comp, filt, interlace = struct.unpack(">IIBBBBB", payload)
            assert (w, h, comp, filt, interlace) == (16, 16, 0, 0, 0)
            assert (color == 3 and depth in (4, 8)) or (color == 0 and depth == 8)
        elif kind == b"PLTE": palette = payload
        elif kind == b"IDAT": data += payload
        elif kind == b"tRNS": raise ValueError("Expected opaque ore/host texture")
        offset += length + 12
    packed, stride = zlib.decompress(data), (16 * depth + 7) // 8
    assert len(packed) == (stride + 1) * 16
    pixels, prior = [], [0] * stride
    for y in range(16):
        start = y * (stride + 1)
        filter_type, row = packed[start], list(packed[start+1:start+1+stride])
        for x in range(stride):
            left, up, corner = row[x-1] if x else 0, prior[x], prior[x-1] if x else 0
            if filter_type == 1: predictor = left
            elif filter_type == 2: predictor = up
            elif filter_type == 3: predictor = (left + up) // 2
            elif filter_type == 4:
                p = left + up - corner
                predictor = min([left, up, corner], key=lambda value: abs(p-value))
            else:
                assert filter_type == 0
                predictor = 0
            row[x] = (row[x] + predictor) & 255
        prior = row
        indices = row if depth == 8 else [v for byte in row for v in (byte >> 4, byte & 15)]
        for value in indices:
            pixels.append([value, value, value, 255] if color == 0 else list(palette[value*3:value*3+3]) + [255])
    assert len(pixels) == 256 and all(len(p) == 4 for p in pixels)
    return pixels


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--client-jar", type=Path)
    parsed = args.parse_args()
    client = parsed.client_jar.read_bytes() if parsed.client_jar else urllib.request.urlopen(URL, timeout=90).read()
    assert hashlib.sha1(client).hexdigest() == SHA1, "Not the pinned official Minecraft 1.21.4 client"
    textures = {}
    with zipfile.ZipFile(io.BytesIO(client)) as archive:
        def image(name): return archive.read(f"assets/minecraft/textures/block/{name}.png")
        hosts = {name: (decode(image(name)), hashlib.sha256(image(name)).hexdigest()) for name in ["stone", "deepslate", "netherrack"]}
        for name in NAMES:
            source = image(name)
            rgba = decode(source)
            host = "deepslate" if name.startswith("deepslate_") else "netherrack" if name.startswith("nether_") else "stone"
            host_pixels, host_hash = hosts[host]
            # Plain stone ore textures modify gray occlusion pixels too. Select
            # mineral chroma (or dark coal) instead of recoloring all differences.
            mask = [int(p != h and (True if name.startswith("nether_") else max(p[:3]) <= 68 if "coal" in name else max(p[:3]) - min(p[:3]) >= 10)) for p, h in zip(rgba, host_pixels)]
            assert 12 <= sum(mask) <= 150, f"Implausible mineral mask for {name}: {sum(mask)}"
            palette = []
            indices = []
            for pixel in rgba:
                if pixel not in palette: palette.append(pixel)
                indices.append(palette.index(pixel))
            assert len(palette) <= 256
            textures[name] = {"palette": palette, "pixels": "".join(f"{i:02x}" for i in indices),
                              "oreMask": "".join(map(str, mask)), "host": host,
                              "pngSha256": hashlib.sha256(source).hexdigest(), "hostPngSha256": host_hash}
    provenance = {"version": "1.21.4", "url": URL, "clientSha1": SHA1,
                  "generator": "scripts/textures/prepare-ore-textures.py", "textures": textures}
    output = Path(__file__).resolve().parents[2] / "src/lib/ore-texture-bases.ts"
    output.write_text("// Generated from hash-pinned official Minecraft assets. Do not edit by hand.\n"
                      "// Minecraft artwork belongs to Mojang/Microsoft; these are limited compatibility bases.\n"
                      "export const ORE_TEXTURE_BASES = " + json.dumps(provenance, indent=2) + " as const;\n", encoding="utf-8")
    print(f"Wrote {len(textures)} opaque ore bases and mineral masks to {output}")
    for name, base in textures.items(): print(name, "mineral pixels:", base["oreMask"].count("1"))


if __name__ == "__main__": main()
