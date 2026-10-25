import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { readShaderReport } from "../src/lib/shader-report";
import { shaderGenerationContext } from "../src/lib/shader-context";
import { generateArtifact } from "../src/lib/generation";
import { shaderPackFixture } from "./fixtures/shader-pack";

function pack(code: string, status = "implemented", extra: { path: string; content: string }[] = []) {
  const fixture = shaderPackFixture();
  const plan = JSON.parse(fixture.files[0].content);
  plan.features = [{ ...plan.features[0], kind: "sky", status, files: ["shaders/gbuffers_clouds.fsh"] }];
  return { ...fixture, files: fixture.files.map(file => file.path === "shader-plan.json"
    ? { ...file, content: JSON.stringify(plan) }
    : file.path === "shaders/gbuffers_clouds.fsh" ? { ...file, content: code } : file).concat(extra) };
}
const warnings = (fixture: ReturnType<typeof pack>) => readShaderReport(fixture.files).features[0].warnings?.join("\n") || "";
const request = { prompt: "Make it realistic like these pictures.", artifactType: "shader_pack" as const,
  target: "iris" as const, version: "1.21.11", modelId: "gpt-6-luna" };

test("retained Amberglass sources expose semantic errors despite legal GLSL and honest approximation", () => {
  const cloud = readFileSync(new URL("./fixtures/amberglass-audit/gbuffers_clouds.fsh", import.meta.url), "utf8");
  const terrain = readFileSync(new URL("./fixtures/amberglass-audit/terrain_fragment.glsl", import.meta.url), "utf8");
  assert.match(warnings(pack(cloud, "approximation")), /camera-dependent solar elevation/);
  const fixture = pack('#include "/lib/example.glsl"', "implemented", [{ path: "shaders/lib/example.glsl", content: terrain }]);
  assert.match(warnings(fixture), /sampled lightmap RGB channels/);
  assert.doesNotMatch(warnings(fixture), /camera-dependent solar/); // terrain uses transformed up
});

test("comment-only patterns, omitted features and unrelated files cannot supply semantic findings", () => {
  const bad = "vec2 lm = texture2D(lightmap, uv).rg; float sky=lm.g; vec3 s=normalize(sunPosition); float h=dot(s,vec3(0,1,0));";
  assert.equal(warnings(pack(`/* ${bad} */\n// ${bad}\nvoid main() {}`)), "");
  assert.doesNotMatch(warnings(pack(bad, "omitted")), /lightmap semantic|camera-dependent solar/);
  assert.equal(warnings(pack("void main() {}", "implemented", [{ path: "shaders/unrelated.glsl", content: bad }])), "");
});

test("correct lightmap colour, coordinate exposures and transformed up remain unflagged", () => {
  const code = `vec3 light = texture2D(lightmap, uv).rgb;
    vec2 exposure=clamp((uv-vec2(1.0/32.0))/(30.0/32.0),0.0,1.0);
    vec3 s=normalize(sunPosition); vec3 up=normalize(mat3(gbufferModelView)*vec3(0,1,0)); float h=dot(s,up);`;
  assert.equal(warnings(pack(code)), "");
  assert.equal(warnings(pack("vec2 colour = texture2D(lightmap, uv).rg; outputColour.xy=colour;")), "");
  assert.match(warnings(pack("float h=dot(vec3(0.0,1.0,0.0),normalize(sunPosition));")), /camera-dependent/);
});

test("solar aliases do not leak between stage files", () => {
  const fixture = pack('#include "/lib/alias.glsl"\nfloat h=dot(s,vec3(0,1,0));', "implemented",
    [{ path: "shaders/lib/alias.glsl", content: "vec3 s=normalize(sunPosition);" }]);
  // Cross-file alias/data flow is deliberately outside this bounded review.
  assert.equal(warnings(fixture), "");
});

test("semantic findings preserve downloadable source with one provider call and visible logs", async () => {
  const code = "#version 120\nvoid main() { vec3 s=normalize(sunPosition); float h=dot(s,vec3(0,1,0)); gl_FragColor=vec4(h); }";
  const fixture = pack(code, "approximation");
  let calls = 0;
  const project = await generateArtifact(request, { name: "Fixture", async generate() { calls++; return fixture; } });
  assert.equal(calls, 1);
  assert.equal(project.status, "success");
  assert.equal(project.artifactAvailable, true);
  assert.equal(project.files.find(file => file.path === "shaders/gbuffers_clouds.fsh")!.content, code);
  assert.ok(project.logs.some(line => /camera-dependent solar elevation/.test(line)));
});

test("short image prompts receive shape, lightmap and gap review without forcing a fixed look", () => {
  const context = shaderGenerationContext({ ...request, attachments: [{ name: "look.png", type: "image/png", data: "fixture" }] });
  assert.match(context, /REFERENCE GAP REVIEW/);
  assert.match(context, /retains its block silhouette/);
  assert.match(context, /Do not force custom clouds for vanilla\/stylized requests/);
  assert.match(context, /combined RGB lighting colour/);
  assert.match(context, /unfulfilledRequests/);
  assert.match(context, /fixed day gradients cannot match night/);
});

test("horizon guidance covers measured branch, alpha and runtime-binding failures", () => {
  const context = shaderGenerationContext(request);
  assert.match(context, /lower-sky blends continuously/);
  assert.match(context, /both colour and alpha/);
  assert.match(context, /nearby glass and underwater behavior separate/);
  assert.match(context, /viewWidth\/viewHeight/);
  assert.match(context, /inverse-transforming camera-up/);
});
