import assert from "node:assert/strict";
import test from "node:test";
import { normalizeShaderUniformOwners } from "../src/lib/shader-normalization";
import { validateProject } from "../src/lib/validation";
import { shaderPackFixture } from "./fixtures/shader-pack";

const root = "shaders/gbuffers_water.fsh";
const header = "shaders/lib/lighting.glsl";
const declaration = "uniform sampler2D lightmap;";
function fixture(rootCode = declaration + '\n#include "/lib/lighting.glsl"', shared = declaration) {
  return [
    { path: root, content: `#version 120\n${rootCode}\nvoid main(){gl_FragColor=texture2D(lightmap,vec2(0.5));}\n` },
    { path: header, content: shared + "\n" },
    { path: "shaders/gbuffers_water.vsh", content: `#version 120\n${declaration}\nvoid main(){gl_Position=ftransform();}\n` },
  ];
}

test("one included owner survives while the redundant root and separate stages remain coherent", () => {
  const files = fixture(declaration + ' // root duplicate\n#include "/lib/lighting.glsl"');
  const result = normalizeShaderUniformOwners(files);
  assert.equal(result.repairs.length, 1);
  assert.match(result.repairs[0], /lightmap.*shaders\/lib\/lighting.glsl/);
  assert.doesNotMatch(result.files[0].content, /^uniform/m);
  assert.match(result.files[0].content, /\/\/ root duplicate/);
  assert.equal(result.files[0].content.split("\n").length, files[0].content.split("\n").length);
  assert.deepEqual(result.files.slice(1), files.slice(1));
  assert.deepEqual(normalizeShaderUniformOwners(result.files), { files: result.files, repairs: [] });
});

test("nested owners and relative includes can supply a root uniform", () => {
  const files = fixture();
  files[1].content = '#include "uniforms.glsl"\n';
  files.push({ path: "shaders/lib/uniforms.glsl", content: declaration + "\n" });
  assert.equal(normalizeShaderUniformOwners(files).repairs.length, 1);
  const reversed = fixture('#include "/lib/lighting.glsl"\n' + declaration);
  assert.equal(normalizeShaderUniformOwners(reversed).repairs.length, 1);
});

test("conditional or macro visibility is never guessed", () => {
  for (const directive of ["#if 1\n#endif", "#define LIGHTING 1", "#undef lightmap", "#extension GL_ARB_shader_texture_lod : enable"]) {
    const files = fixture(declaration + '\n' + directive + '\n#include "/lib/lighting.glsl"');
    assert.deepEqual(normalizeShaderUniformOwners(files), { files, repairs: [] });
  }
  const files = fixture(undefined, "#ifndef LIGHTING\n#define LIGHTING\n" + declaration + "\n#endif");
  assert.deepEqual(normalizeShaderUniformOwners(files), { files, repairs: [] });
});

test("conflicting types, complex declarations, repeated owners and earlier uses stay for compiler diagnosis", () => {
  for (const shared of ["uniform vec4 lightmap;", "uniform sampler2D lightmap[2];", "uniform sampler2D lightmap, shadowtex0;", declaration + "\n" + declaration]) {
    const files = fixture(undefined, shared);
    assert.deepEqual(normalizeShaderUniformOwners(files), { files, repairs: [] });
  }
  const files = fixture(declaration + '\nvec4 sampleLight(){return texture2D(lightmap,vec2(0.5));}\n#include "/lib/lighting.glsl"');
  assert.deepEqual(normalizeShaderUniformOwners(files), { files, repairs: [] });
});

test("missing, cyclic and oversized expansion graphs do not trigger source edits", () => {
  for (const shared of ['#include "missing.glsl"', '#include "lighting.glsl"', Array(302).fill('#include "empty.glsl"').join("\n")]) {
    const files = fixture(undefined, shared);
    files.push({ path: "shaders/lib/empty.glsl", content: "// empty" });
    assert.deepEqual(normalizeShaderUniformOwners(files), { files, repairs: [] });
  }
});

test("validation discloses cleanup but historical incomplete source is retained verbatim", () => {
  const project = shaderPackFixture();
  project.files.push(...fixture());
  const cleaned = validateProject(project, "shader_pack", "iris", "1.21.11");
  assert.match(cleaned.message!, /lightmap.*declaration retained/);
  assert.doesNotMatch(cleaned.message!, /built-in matrix/);
  assert.match(cleaned.message!, /compilation and appearance remain unverified/);
  const retained = validateProject(project, "shader_pack", "iris", "1.21.11", { allowIncompleteShader: true });
  assert.deepEqual(retained.files, project.files);
});
