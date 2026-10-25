# Shader generation quality — 23 October 2026

Test 002 generated WarmHorizon as a composite-only pack. It loaded without a shader compiler error but terrain disappeared in both Lunar and standalone Iris 1.21.11. A manual repair with explicit terrain rendering restored the world; comparison screenshots also showed absent clouds, which remain an unconfirmed preservation issue. This is evidence for better generation context and structural screening, not proof of a single runtime root cause.

The shader playbook now teaches geometry coverage, texture/tint/lightmap/alpha handling, deliberate fallback choices, post-processing, settings placement, version assumptions and an in-game acceptance checklist. This context reaches all existing model adapters through the shared artifact prompt, including follow-up edits. Other artifact playbooks are unchanged.

Generated shader output must include root terrain and cloud vertex/fragment pairs. This is a conservative ModHorizon product policy; Iris supports built-in fallbacks and does not universally require these explicit programs. Every supplied executable program must have a recognised name, paired stages, a leading version directive and a local main entrypoint. Shared GLSL include files may omit those declarations. Quoted includes must resolve to a supplied pack file using a local or pack-absolute path; parent traversal is outside this supported subset. Optional settings belong at `shaders/shaders.properties`.

Older incomplete projects can still be submitted for editing, subject to the existing path/size limits. Only regenerated output must meet the new structural rules. Invalid output produces a specific diagnostic and no downloadable ZIP; this change adds no automatic model retries or extra billable passes.

These are static checks. They do not verify GLSL compilation, varying/uniform types, runtime fallback behavior, visible clouds, lighting, visual quality or FPS. A pack that passes still needs Iris/OptiFine testing. No new paid generation was used to validate this change. Re-run the original WarmHorizon request as a fresh project to measure whether model output improves; preserve the first attempt, manual repair and new generation as separate test results.

Regression coverage includes the original composite-only layout, cloud omissions, orphan stages, invented program names, missing versions/entrypoints, unresolved includes, old-project editing, both runtime targets, specific provider diagnostics and successful ZIP generation from a structurally complete fixture. Fixtures are not GPU-verified reference packs.

Official references checked 23 October 2026:

- [Iris geometry programs and fallback table](https://shaders.properties/current/reference/programs/gbuffers/)
- [Iris terrain shader guide](https://shaders.properties/current/guides/your-first-shaderpack/2_gbuffers/)
- [Iris settings file location](https://shaders.properties/current/reference/shadersproperties/overview/)
