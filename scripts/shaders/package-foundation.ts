import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { packageMinecraftPack } from "../../src/lib/packager";
import { validateProject } from "../../src/lib/validation";

// Run from the repository root. No credentials, provider requests or game launch.
const sourceRoot = resolve("shader-foundations/aurora-horizon");
function collect(directory: string): { path: string; content: string }[] {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error("Shader foundation may not contain symlinks.");
    return entry.isDirectory() ? collect(path) : [{ path: relative(sourceRoot, path).replaceAll("\\", "/"), content: readFileSync(path, "utf8").replaceAll("\r\n", "\n") }];
  });
}
const project = validateProject({ name: "AuroraHorizonCandidate03", files: collect(sourceRoot) }, "shader_pack", "iris", "1.21.11");
const packaged = packageMinecraftPack(project, "shader_pack", "1.21.11");
const output = resolve(process.argv[2] || "../outputs/AuroraHorizon-candidate-03.zip");
const bytes = Buffer.from(packaged.artifact);
if (existsSync(output) && !readFileSync(output).equals(bytes))
  throw new Error(`A different candidate already exists at ${output}. Choose a new filename to preserve test history.`);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, bytes);
console.log(JSON.stringify({ output, files: project.files.length, bytes: bytes.length, reportWarnings: project.shaderReport!.features.flatMap(feature => feature.warnings || []), gpuVisualAcceptance: "pending" }));
