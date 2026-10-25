import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { oreGlowMaterialFiles } from "../../src/lib/ore-glow-materials";

const output = resolve(process.argv[2] || ".data/ore-glow-materials-test02");
const version = process.argv[3] || "1.21.11";
const files = oreGlowMaterialFiles(version);
for (const file of files) {
  const path = resolve(output, file.path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, file.bytes);
}
console.log(JSON.stringify({ output, files: files.length, version, providerCalls: 0 }));
