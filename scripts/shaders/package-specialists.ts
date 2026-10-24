import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { packageMinecraftPack } from "../../src/lib/packager";
import { validateProject } from "../../src/lib/validation";

// Packaging is not a compiler or visual acceptance check. Run check_glsl.py first.
for (const [folder, name] of [["blocks-lab-01", "BlocksLab-candidate-01"], ["clean-sky-lab-01", "CleanSkyLab-candidate-01"], ["blocks-lab-02", "BlocksLab-candidate-02"], ["blocks-lab-03", "BlocksLab-candidate-03"], ["blocks-lab-04", "BlocksLab-candidate-04"], ["blocks-lab-05", "BlocksLab-candidate-05"], ["blocks-lab-06", "BlocksLab-candidate-06"]]) {
  const root = resolve("shader-foundations", folder);
  function collect(directory: string): { path: string; content: string }[] {
    return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
      const path = resolve(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("No symbolic links in candidate source.");
      return entry.isDirectory() ? collect(path) : [{ path: relative(root, path).replaceAll("\\", "/"), content: readFileSync(path, "utf8") }];
    });
  }
  const project = validateProject({ name, files: collect(root) }, "shader_pack", "iris", "1.21.11");
  const artifact = Buffer.from(packageMinecraftPack(project, "shader_pack", "1.21.11").artifact);
  const output = resolve("../outputs", `${name}.zip`);
  if (existsSync(output) && !readFileSync(output).equals(artifact)) throw new Error(`Different candidate at ${output}; use a new candidate version.`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, artifact);
  console.log(JSON.stringify({ output, bytes: artifact.length, files: project.files.length, visualAcceptance: "pending" }));
}
