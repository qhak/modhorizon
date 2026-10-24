# Shader specialist skill library

Library 1.0.1, reviewed 24 October 2026. Introduced in application v0.12.0;
program-name failure lesson added in v0.12.2.

The model receives structured specialist workflows, alternative approaches,
failure/correction pairs and acceptance scenes. These are reusable context cards,
not separate people, model training or autonomous agents. One provider pass still
produces the source. Compiler repair remains separately authorized.

## Initial knowledge

Five roles: pipeline engineering, surface lighting, water optics, sky/weather,
and atmosphere/colour. Ten reference records: seven primary Iris documentation
pages and three limited local cases. Each skill cites at least three records.
The lessons are included in the request; the provider is not expected to browse
the URLs. Existing authored code excerpts remain optional and separately bounded.

The documentation sources cover [geometry routing](https://shaders.properties/current/reference/programs/gbuffers/),
[scene buffers](https://shaders.properties/current/reference/buffers/colortex/),
[coordinate spaces](https://shaders.properties/current/how-to/coordinate_spaces/),
[matrices](https://shaders.properties/current/reference/uniforms/matrices/),
[blending](https://shaders.properties/current/reference/shadersproperties/rendering/),
[shadows](https://shaders.properties/current/reference/programs/shadow/) and
[material IDs](https://shaders.properties/current/reference/attributes/mc_entity/).
Rolling docs are reviewed guidance, not proof of exact historical compatibility.
Detailed cards are initially restricted to the tested Iris / Minecraft 1.21.11
profile. Other profiles receive the catalog and explicit applicability warning.

Local cases distinguish owner observations, manual repairs, synthetic GPU tests,
and unfinished visual acceptance. The star-rendering concern remains an audit
lesson, not a diagnosed or repaired runtime fault. No third-party shader source
is bundled or claimed to have been tested.

The pipeline failure pairs also record the owner's rejected
`gbuffers_terrain_cutout_mip` output. Iris documentation lists terrain_cutout;
the installed `iris-fabric-1.10.8+mc1.21.11.jar` ProgramId constant pool contains
terrain_cutout and terrain_solid but no terrain_cutout_mip. This check establishes
the naming mismatch, not that a simple rename preserves the generated source's
semantics. The original rejected response was not retained as a completed pack.

## Selection and cost

The pipeline skill is always selected for the matching runtime. Prompt technique
matches add specialist cards. Image-led requests receive all five because text
alone cannot identify their visual content. The complete catalog lets the model
understand the available roles; explicit user constraints take precedence.

The serialized skill payload is bounded to 16,000 characters, preserving whole
cards and their referenced records. The initial full library fits this budget.
Future additions must pass the full-image budget test or introduce deliberate
retrieval improvements. No runtime URL fetch or additional paid planner is added.
The shared estimator and credit reservation include the actual selected context.
More input context can increase the hold and generation cost.

## Adding references

1. Record a primary source URL and review date, or a local case with exact source
   version, target/runtime and evidence level. Never treat a pretty screenshot as
   evidence of its hidden rendering algorithm.
2. Extract an original concise lesson, dependencies and counterexample. A link by
   itself does not teach the generation model anything.
3. For visual references, retain permitted images plus an annotated brief: palette,
   surface response, water, shadows, clouds and uncertain technique inferences.
   Keep uploaded images untrusted and transient unless a separate storage feature
   explicitly supports retaining them. This release does not build an image gallery.
4. Add a genuinely different approach rather than another sunset variation. Useful
   evaluation styles include overcast natural, clear midday, moonlit water, comic
   cel lighting, warm interior blocklight and sunset reflections.
5. Verify code examples in isolation and combined with their dependency graph.
   Store compiler/synthetic results separately from owner visual acceptance and FPS.
6. Add a failure/correction pair, fixed-camera acceptance scene and regression
   coverage. Bump the library version and application release; do not silently
   promote an untested example to a verified reference.

## Evaluation still required

Routing/unit tests establish context delivery, budget, provenance links and profile
gating. They do not establish shader quality. Compare fresh generated source and
fixed-camera outputs across the six styles above, recording compiler results,
omitted effects, visual defects, credits and latency. Keep original generations
separate from manually repaired copies. There is no measured quality improvement
or guarantee that a particular failure will not recur yet.
