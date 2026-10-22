import { deflateRawSync } from "node:zlib";
import type { ArtifactType, GeneratedProject, MinecraftVersion } from "./types";

const MAX_ARCHIVE_BYTES = 5_000_000;
const crcTable = new Uint32Array(256);
for (let n = 0; n < crcTable.length; n++) {
  let value = n;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[n] = value >>> 0;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

type ZipEntry = { local: Buffer; central: Buffer };

/** Build a small UTF-8 ZIP in memory. Paths are already constrained by validateProject. */
function zip(files: GeneratedProject["files"]): Uint8Array {
  const entries: ZipEntry[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const compressed = deflateRawSync(content, { level: 6 });
    const checksum = crc32(content);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // Deflate
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12); // DOS epoch: 1980-01-01
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(content.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);

    const central = Buffer.alloc(46 + name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(content.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0x81a40000, 38); // regular file, 0644
    central.writeUInt32LE(offset, 42);
    name.copy(central, 46);
    entries.push({ local: Buffer.concat([local, compressed]), central });
    offset += local.length + compressed.length;
    if (offset > MAX_ARCHIVE_BYTES) throw new Error("Pack archive exceeds the 5 MB download limit.");
  }

  const centralOffset = offset;
  const centralSize = entries.reduce((sum, entry) => sum + entry.central.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);
  const archive = Buffer.concat([...entries.map((entry) => entry.local), ...entries.map((entry) => entry.central), end]);
  if (archive.length > MAX_ARCHIVE_BYTES) throw new Error("Pack archive exceeds the 5 MB download limit.");
  return archive;
}

// Minecraft Java release notes define the resource-pack version per release.
// The 1.21.9 notes also introduce min_format/max_format for pack versions 65+.
// https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9
// https://www.minecraft.net/nl-nl/article/minecraft-java-edition-1-21-11
const RESOURCE_PACK_FORMAT: Record<MinecraftVersion, number> = {
  "1.21.1": 34,
  "1.21.2": 42,
  "1.21.3": 42,
  "1.21.4": 46,
  "1.21.5": 55,
  "1.21.6": 63,
  "1.21.7": 64,
  "1.21.8": 64,
  "1.21.9": 69,
  "1.21.10": 69,
  "1.21.11": 75,
};

/** The resource-pack format for a release, when the table above covers it. */
export function resourcePackFormat(version: MinecraftVersion): number | undefined {
  return Object.hasOwn(RESOURCE_PACK_FORMAT, version) ? RESOURCE_PACK_FORMAT[version] : undefined;
}

export function packageMinecraftPack(project: GeneratedProject, artifactType: ArtifactType, version: MinecraftVersion): { files: GeneratedProject["files"]; artifact: Uint8Array } {
  if (artifactType !== "resource_pack" && artifactType !== "shader_pack")
    throw new Error("ZIP packaging is only available for resource packs and shader packs.");
  let files = project.files;
  const format = artifactType === "resource_pack" ? resourcePackFormat(version) : undefined;
  // Releases outside the table keep the pack_format the model wrote; validation already checked it is an integer.
  if (format !== undefined) {
    files = project.files.map((file) => {
      if (file.path !== "pack.mcmeta") return file;
      const metadata = JSON.parse(file.content) as { pack: Record<string, unknown> };
      metadata.pack.pack_format = format;
      delete metadata.pack.supported_formats;
      if (format >= 65) {
        metadata.pack.min_format = [format, 0];
        metadata.pack.max_format = [format, 0];
      } else {
        delete metadata.pack.min_format;
        delete metadata.pack.max_format;
      }
      return { ...file, content: `${JSON.stringify(metadata, null, 2)}\n` };
    });
  }
  return { files, artifact: zip(files) };
}
