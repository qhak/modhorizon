# Full shader-source generation

## Stage-interface failure lesson - v0.13.2

Generation guidance explicitly separates vertex-only attribute declarations from
shared vertex/fragment varyings and warns against assuming stage macros exist.
It also gives the parsed block-comment form for Iris format metadata. The retained
EmberlightLake output reproduced six failed programs; a separate manual copy with
vertex-owned attributes and block-comment format directives passes 22 stages and
11 links. Native regressions now cover both shared-attribute failure and corrected
stage separation. No compiler definitions are injected to hide errors. Iris
[documents the metadata requirement](https://shaders.properties/current/reference/constants/buffer_format/).
Manual repair is kept separate from the generated first pass. Native compilation
does not verify Iris bindings, appearance or FPS. The original optional paid repair
was skipped because its 12-credit hold exceeded the owner's 10-credit cap; this
does not authorize changing that cap or adding a paid repair.

## Shader archive names - v0.13.1

The shader response schema now constrains name to the same 1-48 ASCII identifier
pattern used by project validation. Matching instructions give an example.
Shader response normalization also converts ordinary human-readable titles into
archive-safe labels before validation, for both classic and requiredFiles replies.
For example, Golden Hour Water becomes Golden-Hour-Water. Accents are decomposed,
separators become hyphens, numeric-leading labels get Shader-, and labels are
bounded to 48 characters. Already-valid identifiers remain unchanged.

The conversion changes only project metadata, never GLSL, resource paths, helper
references or plugin/mod names and classes. Unusable, control-containing or
over-200-character names still fail validation; no generic name or renderer is
invented. Validation also rejects trailing whitespace, including a final newline.
All existing source and compiler checks still run. No extra model call or paid
repair is needed for the name conversion. This does not recover a prior response
already discarded at validation or establish the rest of that source was valid.

## Required geometry in the response schema - v0.13.0

The provider shader response now has `name`, `message`, `requiredFiles` and `files`.
`requiredFiles` is a closed object with four exact keys:

- `shaders/gbuffers_terrain.vsh`
- `shaders/gbuffers_terrain.fsh`
- `shaders/gbuffers_clouds.vsh`
- `shaders/gbuffers_clouds.fsh`

Each value is the model's complete GLSL source string. Additional files contain
the plan, helpers, other programs, properties and README. Required paths must not
also appear there. Normalization maps these strings to ordinary project files,
placing shader-plan.json first, without adding renderer code or changing source.
Storage, compiler, ZIP format and full-source follow-ups retain the normal file list.

OpenAI Responses uses the shader-specific strict schema; Gemini receives the same
schema. Legacy JSON-mode and Anthropic text responses receive matching instructions
but do not gain strict provider enforcement from this change. Complete classic
file-list responses remain readable for legacy/custom providers; static validation
still enforces the geometry baseline. Incomplete generation is still rejected.

The prior generic array schema could not require particular file paths, even with
strong prompt instructions. Closed required fields address that omission for
schema-enforced completions. See [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
reviewed 24 October 2026. This cannot establish that the required source compiles,
contains the requested algorithms or renders correctly; existing gates still apply.

Empty/missing values, unsupported keys and duplicate stages fail without filling
source or adding paid calls. Quotes use the actual artifact-specific schema.
Non-shader schemas retain their previous shape. Missing-stage diagnostics now
list all missing paths without assuming the generated project was composite-only.
The owner's short-prompt error establishes a missing required terrain vertex
stage; the rest of that rejected response was not retained for diagnosis.

## Executable filename contract - v0.12.2

Generation now receives the exact executable filename families used by static
validation through a shared catalog. This preserves the existing allowlist and
does not assert that all accepted names apply to every runtime/version. The
selected runtime's documented interfaces still govern implementation.

The owner's generated gbuffers_terrain_cutout_mip was correctly rejected: the
installed Iris 1.10.8 / Minecraft 1.21.11 ProgramId class and reviewed
[Iris program reference](https://shaders.properties/current/reference/programs/gbuffers/)
support terrain_cutout, not terrain_cutout_mip. Generation is now explicitly told
not to turn game render-layer labels into invented program entrypoints. Rejection
provides a concrete hint and the pipeline skill records the failure/correction.
No automatic filename rewrite, pass merge or extra paid call is introduced.
This does not recover the prior discarded response or prove the next output runs.

## Luna reasoning/output headroom - v0.12.1

Luna shader requests now use a 64,000-token output cap rather than 32,000.
Other shader models retain 32,000; non-shader requests retain 16,000. The model-aware
helper is shared by provider requests, credit quotes/reservations and limit errors.
The larger reservation is shown before the owner initiates another generation.
Source bytes, file limits, transport room, timeouts and repair authorization stay
unchanged. A larger ceiling is not a requirement to generate more code.

OpenAI's [reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning)
states that max_output_tokens includes reasoning and visible output. The reviewed
[Luna page](https://developers.openai.com/api/docs/models/gpt-6-luna) lists 128,000
maximum output tokens (checked 24 October 2026). This app deliberately uses 64,000.
No higher limit is assumed for other providers or model IDs.

Incomplete OpenAI responses now expose only safe numeric diagnostics: reported
total output/reasoning counts when present and received project-text characters.
They still produce no partial ZIP and no automatic retry. Missing usage is not
invented; raw partial source and reasoning are not added to errors or logs.

The owner reported a 32,000-token exhaustion after the skill-library test. That
establishes the reported stop reason, not its reasoning/code split or the amount
of usable source. The expanded context may affect workload, but causality is not
measured. New diagnostics apply to subsequent attempts; this change does not
recover discarded prior response text or establish a successful paid generation.

## Specialist reference library - v0.12.0

Provider input now includes a versioned skill library with task workflows,
alternative methods, failure/correction pairs and acceptance scenes. Its ten
reference records separate primary documentation from limited local evidence.
Text requests select relevant roles plus pipeline engineering; image-led requests
receive all five roles within a 16,000-character budget. Detailed cards are
initially scoped to Iris / Minecraft 1.21.11. Other targets receive an applicability
warning and catalog, with recipes withheld. Context is included in credit estimates.
No extra model calls, runtime web access, visual gallery or permanent training is
introduced. See [library contents, evidence and contribution workflow](shader-skill-library.md).

## Reference-led design and evidence - v0.11.6

All four adapters send actual image blocks alongside shared guidance and current
source on edits. Previously detailed guidance depended on prompt keywords: "like
this image" could receive no detailed water or lighting guidance. Image requests
now receive all five technique modules as a toolbox, with explicit constraints
taking priority. This does not require every effect or a realistic/sunset style.
Text-only routing and bounded, text-ranked code examples retain their behavior.

The design review maps visual goals to algorithms, passes, declaration owners and
buffer contracts using the existing plan format. README acceptance instructions
must describe expected outcomes and failure signs at fixed camera/time/weather.
This is in-call planning, not a separate planner, fine-tuning or screenshot eval.

Reflection warnings inspect cited shader files and reachable includes instead of
borrowing scene/depth tokens from unrelated files. Comments are ignored. Missing
direct scene-colour lookups produce advisory warnings; sampler aliases and helper
data flow need manual review. Lexical evidence cannot prove correct algorithms,
bindings or reference fidelity. Warnings preserve source and trigger no paid call.
Native compile checks and the optional authorized compiler repair remain separate.

The shared input estimator counts the expanded guidance, so image-led input
estimates and credit holds can rise. Output budgets and call counts are unchanged.
No paid generation or new in-game visual result validates this release.

## Response transport room - v0.11.3

Shader provider envelopes now allow2,000,000 bytes, separate from150 KB total
source,80,000 characters per file and32,000 output tokens. Escaped project JSON
and provider metadata can be larger than extracted source. Non-shader envelopes
remain400,000 bytes. Over-limit replies fail with an AI-provider transport error
naming the byte limit; they are not retried or converted into partial ZIPs.
Compiler diagnostic responses separately allow600,000 bytes for escaped JSON;
the producer's80 KB raw output cap remains. The earlier400 KB descriptions below
are historical. No original oversized response was retained, so this update does
not establish how much valid shader source the owner's failed response contained.

## Local High-reasoning timeout - v0.11.2

Configured localhost allows up to ten minutes per shader model pass, with local
HTTP/proxy limits aligned to avoid cutting it off sooner. Hosted requests keep
four minutes. No automatic provider retry, larger output budget or new repair
authorization is introduced. See [transport details](local-shader-compiler.md).

## More implementation room - v0.11.1

Pipeline steps may contain up to 2,000 characters (previously 300), with 1-16
steps. Goal/technique/limitations allow 2,000 characters and reference summaries
4,000. Shader projects may use 60 files, each up to 80,000 characters, within
the existing 150 KB total source boundary. Other artifacts retain their limits.

New shader selections and API requests without an explicit effort use High
reasoning when supported. Users may choose another level; quoting/reservations
reflect it. High effort routes up to four relevant engineering modules. The
model is encouraged to implement the full requested combination and audit its
interfaces, rather than stopping after one or two visual layers. No code padding,
forced delay, new provider passes or preset substitution is introduced. The
32,000 output-token ceiling is unchanged and includes reasoning where applicable.
The earlier 30-file descriptions below are historical.

## Local compiler and optional repair - v0.11.0

Configured Windows local preview checks source with a native driver before
packaging. A failed result retains source and errors, with no ZIP. One optional
paid repair can be enabled with an extra credit limit; it is off by default.
The real repair reservation must fit that limit and the current balance before
calling the provider. A revised project is rechecked once. Compiler outages do
not trigger model calls. Hosted production still uses static checks.
See [setup, protocol and limitations](local-shader-compiler.md).

The one-pass descriptions below describe initial source generation. There are
still no automatic retries for provider JSON/structure failures. A successful
native compile does not establish correct Iris rendering or reference fidelity.

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
