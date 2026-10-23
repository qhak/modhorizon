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
