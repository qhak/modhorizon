import type { GeneratedFile } from "./types";

// Preserve offsets/newlines so comment text is never mistaken for source.
export const maskShaderComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g,
  comment => comment.replace(/[^\r\n]/g, " "));

/** Narrow cleanup, not a GLSL compiler: legacy 110/120 built-in matrix uniforms.
 * Types/names follow GLSL 1.20 section 7.5. Core profiles, shared includes,
 * macros, unknown names, type mismatches and complex declarations are untouched.
 */
export function normalizeShaderMatrices(files: GeneratedFile[]) {
  const repairs: string[] = [];
  const normalized = files.map(file => {
    if (!/\.(vsh|fsh)$/.test(file.path)) return file;
    const masked = maskShaderComments(file.content);
    if (!/^\s*#version[ \t]+(?:110|120)[ \t]*(?:\r?\n|$)/.test(masked)
      || /^\s*#\s*(?:define|undef)\s+gl_/m.test(masked)) return file;
    const declaration = /^[ \t]*uniform[ \t]+(mat[34])[ \t]+(gl_\w+)([ \t]*\[[ \t]*gl_MaxTextureCoords[ \t]*\])?[ \t]*;[ \t]*(?=\r?$)/gm;
    let content = file.content;
    for (const match of masked.matchAll(declaration)) {
      const [, type, name, array] = match;
      const known = array ? type === "mat4" && name === "gl_TextureMatrix"
        : type === "mat3" && name === "gl_NormalMatrix"
          || type === "mat4" && /^gl_(?:ModelView|Projection|ModelViewProjection)Matrix(?:Inverse|Transpose|InverseTranspose)?$/.test(name);
      if (!known) continue;
      const start = match.index!;
      const end = start + match[0].lastIndexOf(";") + 1;
      content = content.slice(0, start) + " ".repeat(end - start) + content.slice(end);
      repairs.push(`${file.path}: removed redundant ${name} declaration; using the GLSL built-in.`);
    }
    return content === file.content ? file : { ...file, content };
  });
  return { files: normalized, repairs };
}

/** Only deduplicate simple uniforms in macro/conditional-free legacy stages.
 * Keep the included owner and every other consumer unchanged. Ambiguous syntax,
 * preprocessing, repeated owners, type conflicts and uses before the owner are
 * left to the real compiler. This is not a general GLSL preprocessor.
 */
export function normalizeShaderUniformOwners(files: GeneratedFile[]) {
  const sources = new Map(files.map(file => [file.path, maskShaderComments(file.content)]));
  const repairs: string[] = [];
  type Row = { path: string; offset: number; text: string };
  function expand(path: string, stack: string[], budget: { calls: number; chars: number }): Row[] | undefined {
    const source = sources.get(path);
    if (source === undefined || stack.includes(path)) return;
    budget.calls++;
    budget.chars += source.length;
    if (budget.calls > 300 || budget.chars > 1_000_000) return;
    const rows: Row[] = [];
    let offset = 0;
    for (const text of source.match(/[^\n]*\n|[^\n]+$/g) || []) {
      const include = /^[ \t]*#[ \t]*include[ \t]+"([^"\r\n]+)"[ \t]*\r?\n?$/.exec(text);
      if (include) {
        const name = include[1];
        if (name.includes("..") || name.includes("\\")) return;
        const target = name.startsWith("/") ? `shaders${name}` : path.slice(0, path.lastIndexOf("/") + 1) + name;
        const nested = expand(target, [...stack, path], budget);
        if (!nested) return;
        rows.push(...nested);
      } else {
        // Includes are expanded above; all other preprocessing except #version
        // makes declaration visibility/order uncertain, so do not edit it.
        if (/^[ \t]*#/.test(text) && !/^[ \t]*#version[ \t]+(?:110|120)[ \t]*\r?\n?$/.test(text)) return;
        rows.push({ path, offset, text });
      }
      offset += text.length;
    }
    return rows;
  }
  const normalized = files.map(file => {
    if (!/\.(vsh|fsh)$/.test(file.path)
      || !/^\s*#version[ \t]+(?:110|120)[ \t]*(?:\r?\n|$)/.test(sources.get(file.path)!)) return file;
    const rows = expand(file.path, [], { calls: 0, chars: 0 });
    if (!rows) return file;
    const declarations = new Map<string, { row: Row; type: string; index: number }[]>();
    let depth = 0;
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      if (/\buniform\b/.test(row.text)) {
        const match = /^[ \t]*uniform[ \t]+(sampler2D|sampler2DShadow|samplerCube|float|int|bool|[bi]?vec[234]|mat[234])[ \t]+([A-Za-z_]\w*)[ \t]*;[ \t]*\r?\n?$/.exec(row.text);
        if (!match || depth !== 0) return file;
        const owners = declarations.get(match[2]) || [];
        owners.push({ row, type: match[1], index });
        declarations.set(match[2], owners);
      }
      depth += (row.text.match(/\{/g)?.length || 0) - (row.text.match(/\}/g)?.length || 0);
    }
    let content = file.content;
    for (const [name, owners] of declarations) {
      if (owners.length !== 2 || owners[0].type !== owners[1].type) continue;
      const root = owners.find(owner => owner.row.path === file.path);
      const included = owners.find(owner => owner.row.path !== file.path);
      if (!root || !included || name.startsWith("gl_")) continue;
      // The retained owner must precede all uses. Removing an earlier root
      // declaration must not leave a helper referencing an undeclared symbol.
      const beforeOwner = rows.slice(0, included.index).filter(row => row !== root.row).map(row => row.text).join("\n");
      if (new RegExp(`\\b${name}\\b`).test(beforeOwner)) continue;
      const start = root.row.offset;
      const end = start + root.row.text.lastIndexOf(";") + 1;
      content = content.slice(0, start) + " ".repeat(end - start) + content.slice(end);
      repairs.push(`${file.path}: removed redundant ${name}; declaration retained in ${included.row.path}.`);
    }
    return content === file.content ? file : { ...file, content };
  });
  return { files: normalized, repairs };
}
