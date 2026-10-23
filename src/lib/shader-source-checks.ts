import type { GeneratedFile } from "./types";
import { maskShaderComments } from "./shader-normalization";

/** Conservative source contracts, not GLSL compilation or buffer-dataflow proof.
 * Iris routing maps gl_FragData slots to attachments, not attachment IDs to slots:
 * https://shaders.properties/current/reference/constants/rendertargets/
 * Conditional/multiple routing and computed indices need runtime compilation.
 */
export function checkShaderSourceContracts(files: GeneratedFile[]): void {
  const sources = new Map(files.filter(file => /\.(?:vsh|fsh|glsl)$/.test(file.path))
    .map(file => [file.path, file.content]));
  const includes = new Map<string, string[]>();
  for (const [path, content] of sources) {
    const dependencies = [...maskShaderComments(content).matchAll(/^[ \t]*#[ \t]*include[ \t]+"([^"]+)"/gm)]
      .map(match => match[1].startsWith("/") ? `shaders${match[1]}`
        : path.slice(0, path.lastIndexOf("/") + 1) + match[1]);
    includes.set(path, dependencies);
  }
  const checked = new Set<string>();
  function visit(path: string, stack: string[]): void {
    const cycleStart = stack.indexOf(path);
    if (cycleStart !== -1)
      throw new Error(`Shader include cycle: ${[...stack.slice(cycleStart), path].join(" -> ")}.`);
    if (checked.has(path)) return;
    for (const dependency of includes.get(path) || []) visit(dependency, [...stack, path]);
    checked.add(path);
  }
  for (const path of sources.keys()) if (/\.(?:vsh|fsh)$/.test(path)) visit(path, []);

  for (const [path] of sources) {
    if (!path.endsWith(".fsh")) continue;
    // Collect each reachable source once, avoiding exponential textual expansion.
    const reached = new Set<string>();
    function collect(source: string): void {
      if (reached.has(source)) return;
      reached.add(source);
      for (const dependency of includes.get(source) || []) collect(dependency);
    }
    collect(path);
    const chunks = [...reached].map(source => sources.get(source) || "");
    const code = chunks.map(maskShaderComments).join("\n");
    // No preprocessor evaluator: never compare potentially inactive source branches.
    if (/^[ \t]*#[ \t]*(?:if|ifdef|ifndef|elif|else)\b/m.test(code)) continue;
    const routes = chunks.flatMap(content => [...content.matchAll(
      /^[ \t]*\/\*[ \t]*(DRAWBUFFERS|RENDERTARGETS)[ \t]*:[ \t]*([^\r\n]*?)[ \t]*\*\/[ \t]*\r?$/gm,
    )]).map(match => {
      const value = match[2].trim();
      if (match[1] === "DRAWBUFFERS" && /^\d+$/.test(value)) return value.split("");
      if (match[1] === "RENDERTARGETS" && /^\d+(?:[ \t]*,[ \t]*\d+)*$/.test(value)) return value.split(",");
      return undefined;
    });
    if (routes.length !== 1 || !routes[0]) continue;
    const count = routes[0].length;
    for (const match of code.matchAll(/\bgl_FragData[ \t]*\[[ \t]*(-?\d+)[ \t]*\][ \t]*(?:\.[xyzwrgba]{1,4}[ \t]*)?(?:[+*/-]?=(?!=))/g)) {
      const slot = Number(match[1]);
      if (slot < 0 || slot >= count)
        throw new Error(`${path} writes gl_FragData[${slot}], but its explicit output routing defines only ${count} output slot(s), indexed 0-${count - 1}. Use the output slot index, not the colortex attachment number.`);
    }
  }
}
