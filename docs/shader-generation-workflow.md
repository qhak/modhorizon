# Reference-guided shader workflow — v0.6.0

## Specification and architecture

The product target is an image plus ordinary instructions producing a working shader with a meaningful resemblance to the requested appearance. Earlier runtime tests produced invisible geometry, horizon seams, weak colour changes and omissions of defining effects. This release is the first workflow stage toward that goal; it does not establish reference-level visual quality.

The previous monolithic shader prompt is replaced by a shared preservation baseline, task-selected technique modules, reference interpretation, follow-up preservation and an explicit feature contract. `shader-context.ts` selects at most two detailed modules for sky, lighting/shadows, water/reflections or haze/post, weighted toward explicit focus phrases. Simple colour-grade tasks get no advanced module. Image requests additionally receive a compact technique index so the model can route observable needs that were not named in text. Target/runtime/version are explicit; guidance does not treat current Iris docs as universal for historical runtimes or OptiFine.

In **one model response**, the model is instructed to interpret the reference, prioritise visible goals, choose a coherent pass/buffer/material design, generate the source and audit its feature claims. A required first `shader-plan.json` file records the appearance goal, observed/inferred reference cues, ordered pipeline decisions and features. File order is an instruction, not a proof of the model's internal reasoning. No separate image-analysis call, autonomous paid iteration or automatic shader repair was added.

Feature entries contain name, kind, priority 1-3, status (`implemented`, `approximation`, `omitted`), concrete technique, source paths and limitations. Major requested effects must be accounted for by instruction; the server cannot independently infer all requested visual features from an image. Omitted features have no source references; other statuses must link to existing shader source. This metadata is included in the ZIP and counts toward the existing 30-file/150-KB output limits.

`readShaderReport` validates and derives the report from files, ignoring any untrusted top-level report supplied by a provider or restored browser object. Generation logs and the workspace show model-reported implementation, approximations and omissions. The panel explicitly labels compilation/appearance unverified. Existing `success` still means a packaged ZIP, not completed user-goal acceptance. Old projects without a plan remain editable; only new generated output must supply the contract.

## Narrow static gates

Existing path/size, stage pairing, root terrain/cloud coverage, includes and entrypoint checks remain. Explicit terrain/cloud coverage is a ModHorizon supported-profile policy, not a universal Iris rule.

Additional guards catch custom uniform/attribute/varying declarations using reserved `gl_` names and direct floating literals in `#if`/`#elif`. Built-in expressions, comments and integer conditions remain accepted. These checks are not a preprocessor or compiler and do not catch every illegal declaration or macro expansion.

For the supported conventional pipeline, a feature reported as implemented cast shadows needs a shadow program. Implemented scene reflections need scene-colour (`colortex`/legacy `gcolor`) and scene-depth (`depthtex`) references in supplied shader source. Without these prerequisites, generation fails with a specific instruction to implement the pipeline or report an approximation/omission. These checks establish necessary source dependencies in this profile, not correct shadow/reflection math, used variables, material gating, sampling quality or a visual match. They are not general shader architecture proofs.

## Technique guidance incorporated

- Sky: consistent view/sun/up directions, sun elevation, per-pixel direction assumptions, broad continuous gradients, fog/horizon and sky render-stage coverage.
- Lighting: normals and directional light, biome/ambient/block light preservation, paired shadow pass, transforms/bias/filtering and honest classification of shafts versus a tint.
- Water: distinguish water from glass and other translucency; fluid classification alone is not a water ID. Plan opaque scene copies and scene-depth/normal-dependent bounded reflections, with off-screen fallback. Procedural sky tint is an approximation, not reflected trees/buildings.
- Atmosphere: meaningful distance reconstruction, matching horizon colours, highlight-only bloom and a coherent exposure convention.

The existing quote estimator composes the same system/user context as generation, so routed modules, plan instructions, project source, errors and image allowance are accounted for. Actual token/cost improvement has not been measured; no pricing/minimum-credit changes were made.

## Validation and completion boundary

Automated regressions cover deterministic bounded routing, explicit water priority, image/follow-up prompts, a single baseline, plan schema/source links, old-project editing, prerequisite failures, honest omissions, report retention, single-call generation and GLSL hazard fixtures. Existing provider payload tests confirm the workflow reaches all four provider adapters. Browser checks use fixtures with images and incomplete feature scope to verify visible untested/omitted labels and mobile layout without a provider call.

Still required: actual fresh model generations with reference images; target GLSL/Iris compilation; a runtime-verified baseline/template library; controlled day/night and water/glass scenes; visual comparison against references; measured cost, latency and FPS. No compiler, screenshot evaluator or visual repair loop is implemented by this release. A source-linked plan alone must not be reported as improved shader fidelity.

Initial acceptance set: warm grade, sky-only sunset, shadowed forest, reflective water beside neutral glass, full day/night and targeted follow-up preservation. Keep generated, manually repaired and subsequent attempts separate. Record model/settings, credits/tokens/time, compile result, runtime preservation and requested-feature coverage.

Primary sources checked 23 October 2026: [Iris matrix spaces](https://shaders.properties/current/reference/uniforms/matrices/), [sun position and timing](https://shaders.properties/current/reference/uniforms/world/), [material IDs and fluid classification](https://shaders.properties/current/reference/attributes/mc_entity/), [scene colour buffers](https://shaders.properties/current/reference/buffers/colortex/). The owner's shader-context research supplied the modular workflow and evaluation proposal; concrete runtime failures remain the evidence behind the regression cases.
## Compatibility cleanup — v0.6.1

The first owner test of v0.6.0 failed the reserved `gl_` declaration check in `shaders/composite.fsh`. Rejected output was not retained, so the exact variable is unknown. This does not establish that the whole pack would compile or resemble the reference.

Before output validation, a narrow deterministic cleanup removes standalone, correctly typed legacy matrix uniform declarations in GLSL 110/120 executable stages. Matrix types/names follow [GLSL 1.20 section 7.5](https://registry.khronos.org/OpenGL/specs/gl/GLSLangSpec.1.20.pdf), checked 23 October 2026. Uses and line numbers are preserved and cleanup is disclosed in the model response. There is no extra provider call. Core/modern profiles, shared includes, unknown names, mismatched types, macros for reserved names, and complex declarations are not repaired. Remaining reserved declaration errors now identify the variable and line. This is not a shader compiler.
