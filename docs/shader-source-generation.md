# Full shader-source generation — v0.10.0

## Completion handling update — v0.10.1

Shader requests now allow 32,000 output tokens; other artifact types retain 16,000.
The same helper configures all provider requests and the maximum credit hold
shown before generation. Actual-usage settlement and existing failed-pass refunds
are unchanged. This budget includes provider reasoning where applicable; it is
not a guarantee of a particular source length or model-supported effect.

Explicit incomplete/length stops and refusals are checked before parsing, even
when returned text happens to form valid JSON. OpenAI response text segments are
joined in order, excluding reasoning/tool blocks. Empty text, malformed project
JSON, response-envelope errors and source validation now have distinct messages.
No automatic paid retry, truncation repair or preset fallback occurs. The outer
provider response is bounded at 400,000 bytes; generated source still has the
existing 30-file/150 KB limits. Raw provider bodies/source/images are not logged.

The owner's first full-source test failed with a generic JSON error after about
2.3 minutes. Its raw response was not retained, so truncation is a plausible cause,
not an established diagnosis. Tests of completion handling do not prove that a
new real generation will succeed. See [OpenAI structured-output edge cases](https://developers.openai.com/api/docs/guides/structured-outputs),
[Claude stop reasons](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons)
and [Gemini interaction status](https://ai.google.dev/api/interactions-api), checked 23 October 2026.

## Goal and scope

Generate different shaders from instructions and reference images, including
new GLSL effects and rendering pipelines. The v0.9 eight-control adapter produced
variations of one renderer and did not meet this goal. From v0.10 every shader
provider returns complete project files; the server never replaces its response
with AuroraHorizon source or accepts a settings-only JSON as a shader.

The existing product contract still limits source to 30 files/150 KB, supported
runtime program names, paired stages and explicit terrain/cloud coverage. This
is general shader generation within those bounds, not unrestricted files or
unlimited renderer complexity. Source still needs actual Iris/OptiFine tests.

## One model pass: plan, source, static checks

1. The shared system context asks the model to interpret instructions/images,
   choose the requested visual style and plan its pass/buffer/material contracts.
2. It returns `shader-plan.json` first and complete executable shader sources.
   The feature report identifies implemented source, approximations and omissions;
   it does not establish compilation, appearance or FPS.
3. The server checks allowed paths/size, program pairs, leading version/main,
   reserved declarations, includes, feature citations and concrete output errors.
   Include cycles fail with their dependency chain. For unambiguous explicit
   routing, literal `gl_FragData[N]` assignments must address the available output
   slots, not attachment IDs. Conditional/computed/modern outputs remain compiler
   concerns. Composite ping-pong reads and legal shared includes stay allowed.
4. Valid source is packaged. Failure does not trigger an extra paid call or silently
   fall back to a preset. No new automatic planner or repair call is introduced.

This release does **not** implement per-output native compilation or automatic
compiler-driven repairs. The Windows offline checker is available for deliberate
development tests, but the deployed Worker cannot execute it. These are next
steps, not capabilities established by packaging.

## Optional examples and context limits

`src/lib/shader-examples.ts` selects actual excerpts from the pinned authored
renderer according to the requested effects. Example groups include dependency,
coordinate-space and buffer-lifetime descriptions. Full groups fit within an
11,000-character JSON budget; source is never cut mid-function. They are examples,
not complete drop-in shader packs or a required palette. The model may write a
different pipeline and effects absent from them.

Source excerpts are supplied only for the matching Iris 1.21.11 target. Other
targets/versions receive general failure lessons without Iris-specific code.
Dedicated stylized context supports requests such as cel shading/outlines without
assuming that every user wants realistic golden water.

Evidence is explicitly scoped: the owner liked candidate02 water and later
reported GoldenHourWater much better after selecting the correct pack. Candidate03
terrain remains experimental; none of this validates a newly generated shader.

All four adapters share the context and actual image transport. Quotes and
missing-usage estimates include the actual selected examples, current full source,
schema and images. Missing-usage output fallback counts returned model text,
including GLSL. Actual usage accounting and reservation policy are unchanged.

## Existing projects and acceptance

Historical look-adapter projects remain editable and downloadable. Follow-ups
send all current files rather than a summarized look; the model is told to
preserve working features and remove obsolete adapter metadata/provenance when
changing source. Historical assembly/recognition helpers remain for regression
fixtures, not provider routing. Existing unrecognised/custom shaders also retain
their complete source.

Regression coverage checks all four adapters for new shaders and old foundation
follow-ups, returned custom GLSL without substitution, settings-only rejection,
no extra calls on static failure, target-aware bounded examples, shared/cyclic
includes and explicit multi-target routing. Real evaluation still requires separate
sunset-water, vanilla-style and stylized generations plus fixed-camera in-game
comparisons, error logs, real credit usage and FPS. No real paid generation or
visual acceptance is implied by fixture tests.
