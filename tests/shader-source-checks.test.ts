import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { checkShaderSourceContracts } from "../src/lib/shader-source-checks";
import { InputError, validateProject } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

const file = (path: string, content: string) => ({ path: `shaders/${path}`, content });
const fragment = (content: string) => file("composite.fsh", content);

test("reachable direct and indirect include cycles fail with the actual chain", () => {
  assert.throws(() => checkShaderSourceContracts([fragment('#include "composite.fsh"')]), /include cycle: shaders\/composite.fsh -> shaders\/composite.fsh/);
  assert.throws(() => checkShaderSourceContracts([
    fragment('#include "/lib/a.glsl"'), file("lib/a.glsl", '#include "b.glsl"'),
    file("lib/b.glsl", '#include "/lib/a.glsl"'),
  ]), /lib\/a.glsl -> shaders\/lib\/b.glsl -> shaders\/lib\/a.glsl/);
});

test("shared DAG includes, comments, dimension-relative sources and unused libraries do not create cycles", () => {
  assert.doesNotThrow(() => checkShaderSourceContracts([
    fragment('#include "/lib/a.glsl"\n#include "/lib/b.glsl"\n// #include "composite.fsh"'),
    file("lib/a.glsl", '#include "common.glsl"'), file("lib/b.glsl", '#include "common.glsl"'),
    file("lib/common.glsl", "/* #include \"common.glsl\" */"),
    file("world0/composite.fsh", '#include "colour.glsl"'), file("world0/colour.glsl", "vec3 colour;"),
    file("lib/unused.glsl", '#include "unused.glsl"'),
  ]));
});

test("explicit routes map output slots, including multi-digit attachment IDs", () => {
  for (const directive of ["/* DRAWBUFFERS:07 */", "/* RENDERTARGETS: 0,13 */"])
    assert.doesNotThrow(() => checkShaderSourceContracts([fragment(`${directive}\nvoid main(){gl_FragData[0]=vec4(1);gl_FragData[1].rgb=vec3(1);}`)]));
  for (const directive of ["/* DRAWBUFFERS:7 */", "/* RENDERTARGETS: 13 */"])
    assert.throws(() => checkShaderSourceContracts([fragment(`${directive}\nvoid main(){gl_FragData[7]=vec4(1);}`)]), /gl_FragData\[7\].*only 1 output slot/);
  assert.throws(() => checkShaderSourceContracts([fragment('/* RENDERTARGETS: 0,13 */\nvoid main(){gl_FragData[2].rgba += vec4(1);}')]), /output slot index/);
});

test("literal out-of-range assignments in reachable includes are checked", () => {
  assert.throws(() => checkShaderSourceContracts([
    fragment('/* RENDERTARGETS: 4 */\n#include "/lib/output.glsl"'),
    file("lib/output.glsl", "void writeColour(){gl_FragData[4]=vec4(1);}"),
  ]), /gl_FragData\[4\]/);
});

test("implicit, conditional, computed, modern and conflicting routing remain compiler concerns", () => {
  const cases = [
    "void main(){gl_FragData[3]=vec4(1);}",
    "/* RENDERTARGETS: 0 */\n#if EXTRA\nvoid main(){gl_FragData[3]=vec4(1);}\n#endif",
    "/* DRAWBUFFERS:0 */\n/* DRAWBUFFERS:0123 */\nvoid main(){gl_FragData[3]=vec4(1);}",
    "/* RENDERTARGETS: 0 */\nvoid main(){gl_FragData[OUTPUT_INDEX]=vec4(1);}",
    "/* RENDERTARGETS: 0 */\nlayout(location=0) out vec4 colour;void main(){colour=vec4(1);}",
    "/* RENDERTARGETS: 0 */\nvoid main(){gl_FragColor=vec4(1);}",
    "// /* RENDERTARGETS: 0 */\nvoid main(){gl_FragData[3]=vec4(1);}",
  ];
  for (const content of cases) assert.doesNotThrow(() => checkShaderSourceContracts([fragment(content)]));
});

test("comments, legal built-ins and composite ping-pong reads are not rejected", () => {
  assert.doesNotThrow(() => checkShaderSourceContracts([fragment(`/* RENDERTARGETS: 0 */
uniform sampler2D colortex0;
// gl_FragData[8] = vec4(1);
/* gl_FragData[9].rgb = vec3(1); */
void main(){gl_FragData[0] = texture2D(colortex0,gl_FragCoord.xy);}`)]));
});

test("validation wires concrete failures as InputError while old projects remain editable", () => {
  const original = shaderPackFixture();
  const fixture = { ...original, files: original.files.map(file => file.path === "shaders/gbuffers_terrain.fsh"
    ? { ...file, content: "#version 120\n/* DRAWBUFFERS:0 */\nvoid main(){gl_FragData[3]=vec4(1);}" } : file) };
  assert.throws(() => validateProject(fixture, "shader_pack", "iris", "1.21.11"), error => error instanceof InputError && /output slot/.test(error.message));
  assert.doesNotThrow(() => validateProject(fixture, "shader_pack", "iris", "1.21.11", { allowIncompleteShader: true }));
  const cycle = { ...original, files: original.files.map(file => file.path === "shaders/gbuffers_terrain.vsh"
    ? { ...file, content: file.content + '\n#include "gbuffers_terrain.vsh"' } : file) };
  assert.throws(() => validateProject(cycle, "shader_pack", "iris", "1.21.11"), /include cycle/);
  const missing = { ...original, files: original.files.map(file => file.path === "shaders/gbuffers_terrain.vsh"
    ? { ...file, content: file.content + '\n# include "missing.glsl"' } : file) };
  assert.throws(() => validateProject(missing, "shader_pack", "iris", "1.21.11"), /includes a missing/);
});

test("existing fixture and actual authored foundation pass without source mutation", () => {
  const fixture = shaderPackFixture();
  const copy = structuredClone(fixture.files);
  checkShaderSourceContracts(fixture.files);
  assert.deepEqual(fixture.files, copy);
  const root = join(process.cwd(), "shader-foundations/aurora-horizon");
  function collect(directory: string): { path: string; content: string }[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? collect(path) : [{ path: relative(root, path).replaceAll("\\", "/"), content: readFileSync(path, "utf8") }];
    });
  }
  const files = collect(root);
  const before = structuredClone(files);
  assert.doesNotThrow(() => checkShaderSourceContracts(files));
  assert.deepEqual(files, before);
});
