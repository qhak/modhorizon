import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

// Build-time snapshot only. The deployed Worker never reads the filesystem.
const root = join(process.cwd(), "shader-foundations/aurora-horizon");
const collect = (directory: string): { path: string; content: string }[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collect(path) : [{
      path: relative(root, path).replaceAll("\\", "/"),
      content: readFileSync(path, "utf8").replaceAll("\r\n", "\n"),
    }];
  });
writeFileSync("src/lib/shader-foundation-data.json", JSON.stringify(collect(root), null, 2) + "\n");
