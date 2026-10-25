import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { validateProject } from "../../src/lib/validation";
import { packageMinecraftPack } from "../../src/lib/packager";

const root = resolve("shader-foundations/ore-glow-01");
function collect(directory: string): { path: string; content: string }[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error("Authored shader source cannot contain symlinks.");
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? collect(path) : [{ path: relative(root, path).replaceAll("\\", "/"), content: readFileSync(path, "utf8") }];
  });
}
const project = validateProject({ name: "OreGlowTest02", files: collect(root) }, "shader_pack", "iris", "1.21.11");
const archive = Buffer.from(packageMinecraftPack(project, "shader_pack", "1.21.11").artifact);
const output = resolve(process.argv[2] || "../outputs/OreGlow-test02.zip");
if (existsSync(output) && !readFileSync(output).equals(archive)) throw new Error("Preserve existing candidates: choose another output filename.");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, archive);
console.log(JSON.stringify({ output, sourceFiles: project.files.length, bytes: archive.length, appearanceAcceptance: "pending" }));
