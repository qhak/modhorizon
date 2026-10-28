# Change notes
## v0.23.5 - 2026-10-28

- Allow local AI generation calls up to ten minutes and increase Luna's non-shader output budget to 32,000 tokens, reflected in credit reservations.

Validation: targeted provider, timeout and credit quote tests; TypeScript and Cloudflare build. Provider, hosted and response limits remain; no live generation or deployment performed.

## v0.23.4 - 2026-10-28

- Enlarge the reasoning slider handle to match the height of its track.

Validation: browser preview and slider interaction, and Cloudflare production build. No production deployment performed.

## v0.23.3 - 2026-10-28

- Keep the reasoning picker in place when changing effort levels and keep it open after resetting to the default.

Validation: TypeScript check, Cloudflare build, and browser interaction. No production deployment performed.

## v0.23.2 - 2026-10-28

- Correct the release-readiness baseline to record v0.23.1 as pushed and included in PR #5.

Validation: reviewed the pushed branch and release metadata. No application behavior or production settings changed.

## v0.23.1 - 2026-10-28

- Refine the reasoning picker into a compact card with a discrete pill slider, current model and effort labels, and a reset-to-default control.

Validation: TypeScript check, Cloudflare production build, browser preview and keyboard interaction. No production deployment or provider settings changed.

## v0.23.0 - 2026-10-28

- Replace the reasoning effort menu with a discrete keyboard-accessible slider and clearly labeled supported levels. Keep each provider's default marked and close the picker safely when changing to a model without reasoning controls.

Validation: TypeScript check, Cloudflare production build, and browser preview keyboard interaction passed. The automated test suite was not run. No production settings or deployment changed.

## v0.22.1 - 2026-10-28

- Refresh the Stripe and release-readiness guides to match the current verified-account, billing-portal, top-up promotion-code and migration behavior. Mark old deployment notes as historical and guide end-to-end payment checks toward an isolated test environment.

Validation: documentation cross-check against current routes, configuration, migration and v0.22.0 test/build evidence; git diff --check. No tests, production settings, migrations or deployment changed.

## v0.22.0 - 2026-10-27

- Allow Stripe promotion codes on credit pack Checkout. Webhooks verify the original server-quoted subtotal, discount arithmetic, zero tax/shipping, paid status, and currency before granting the quoted credits; billing history records the amount actually paid. Fully discounted or mismatched sessions grant nothing.
- Add social reward campaign URL, one-time claim, daily limit, expiry, credit allocation and refund coverage; update migration fixtures for the social rewards schema.

Validation: all 229 tests, TypeScript check, Next.js production build and Cloudflare Worker build pass. No production migration, Stripe setting change or deployment was run. Real Stripe test-mode checkout still needs owner acceptance.

## v0.21.0 - 2026-10-27

- Add one Rewards hub for optional rewarded ads and configurable social follow campaigns. Free accounts can submit one PNG/JPEG screenshot per campaign; server-side vision review checks the configured profile and visible Following state, with a three-review daily cap.
- Add private in-memory screenshot processing, a separate seven-day social-credit bucket, generation reservation/refund/expiry accounting, account deletion cleanup, and social reward ledger labels. Keep social rewards disabled until official account URLs and a vision API key are configured.
- Document campaign setup, privacy limits, and rollout requirements. No D1 migration or production deployment was run.

Validation: TypeScript, Next.js production build, Cloudflare Worker build, and in-memory migrations 0001-0010 pass. No test suite was added or run. Social profile configuration, real provider acceptance, and production migration/deployment remain outstanding. Screenshot review is heuristic and cannot prove authenticity or an ongoing follow.


## v0.20.0 - 2026-10-27

- Add an opt-in Google Ad Manager rewarded web ad flow for verified Free accounts, capped at five completed ads per UTC day. Each completion grants one separate credit that expires after seven days; generation spends weekly or monthly allowance first, then ad rewards, then purchased credits.
- Bind one-time ad claims to the signed-in account, reject replayed rewards, include ad credits in billing history and account deletion, and safely restore unexpired ad credits after refunded or partially used generation.
- Keep ad serving disabled until the server feature flag and valid GAM ad-unit path are configured. Document publisher setup and the UK, EEA and Swiss consent gate. Subscription Checkout displays Stripe promotion codes; top-up Checkout remains amount-validated without discounts.

Validation: 225 tests, TypeScript check, and Next.js production build pass. No live ads, production migration or deployment was run. Google Ad Manager network/ad-unit setup, a certified consent flow for relevant regions, and real browser/ad-fill acceptance remain outstanding. GPT web completion is client-reported and can be forged by a determined client; account caps and one-use server claims limit replay but do not provide cryptographic completion proof.

## v0.19.1 - 2026-10-27

- Consolidate the current release baseline, production launch gates, verification evidence and broader capability gaps in `docs/release-readiness.md`.
- Distinguish the pushed v0.19.0 source candidate from `origin/main` v0.15.0 and from a production deployment; record external acceptance still required for identity, billing, generation, community and deletion.

Validation: documentation and version metadata review. No production settings, deployments, migrations or external accounts were changed.

## v0.19.0 - 2026-10-26

- Add profile/comment reporting, searchable moderation, hide/restore controls and transactional action records. Hidden creators and their public work/screenshots disappear; their accounts cannot override the restriction.
- Add a disabled-by-default self-service deletion flow with recent verified sign-in, typed confirmation and disclosed billing/data retention. Pending deletion blocks access and new generation/checkout activity while retryable cleanup removes owned community data, cancels billing and removes provider sign-in.
- Guard late billing events, in-flight writes and artifact downloads against deletion races. Preserve unrelated users and disconnected financial records; unowned legacy artifacts must be regenerated.
- Document setup, recovery, retention limits and disposable staging acceptance in docs/community-moderation-and-deletion.md. Apply D1 migrations 0007/0008 before serving this release.

Validation: 221 tests and TypeScript pass; isolated production build checked. Local browser report/deletion controls and anonymous/cross-origin API guards checked. Destructive provider calls use fixtures/mocked network only; local deletion remains disabled. No production migration/deployment, real account deletion or live subscription cancellation. Separate staging provider/billing acceptance and retention policy remain required before enabling production deletion.


## v0.18.2 - 2026-10-26

- Refresh saved creator-profile state immediately so a newly registered handle locks without a page reload. Reproduce the stale editable field and verify the corrected first-save behavior with a second confirmed account.
- Refresh server-rendered profile statistics after follow/unfollow so the header matches the updated control without a manual reload.
- Remove invalid owner Edit/Unpublish controls for moderation-hidden showcases; server enforcement remains authoritative.
- Record real local two-account community acceptance: private draft/screenshot isolation, denied non-moderator access, review submission/approval, public discovery, edit withdrawal and explicit unpublishing. See docs/community-acceptance-20261026.md for completed and pending checks.

Validation: 204 tests, TypeScript and isolated production build pass. Existing confirmed-account sessions and local D1 data were used; no production migration/deployment or billable generation. Viewer interactions, report hiding, owner resubmission rejection and temporary permission cleanup also verified; production acceptance remains separate.


## v0.18.1 - 2026-10-26

- Replace slogan-heavy community headings, form labels and empty states with direct descriptions. Use concrete sample project names and shorter preview/testing notes while retaining privacy and review information.
- Preserve the existing layout and visual style.

Validation: TypeScript check and local browser review pass. Copy-only change; no behavior, schema or deployment changes.


## v0.18.0 - 2026-10-26

- Add community Explore, public creator profiles and stable showcase pages in the existing dark graphite/starfield design, with filtering, screenshots, external release links, likes, follows and discussion.
- Add explicit drafts, review submission, trusted moderator approval and report hiding. Preserve private workspace data; successful builds prefill only basic showcase fields. Bound uploads/writes, enforce ownership and same-origin requests, and prevent stale-review approvals.
- Add production-origin canonical metadata, structured data, sitemap and robots controls. Local, sample, filtered and private views stay non-indexable. Include labelled design samples without seeding real posts.

Validation: 204 tests, TypeScript checks and production build pass; local D1 migration applied. Desktop/mobile preview and anonymous routes checked. No deployment or live database changes; authenticated staging acceptance and launch moderation/retention work remain. See docs/community.md.


## v0.17.2 - 2026-10-25

- Repair OreGlow's Iris loader failure: use four explicit colortex6ClearColor components rather than the GLSL-valid scalar splat. Reproduce the exact reported index exception with the installed Iris parser, then verify the repaired constructor is accepted.
- Add a conservative loader-metadata source check and regression; teach the generator the parser/GLSL distinction within the existing context budget. Preserve ordinary GLSL splats and conditional-source handling.
- Package separate test02 shader/material ZIPs without overwriting test01. Target companion metadata to the current Lunar client's verified Minecraft 1.21.11, including mandatory min/max formats.

Validation: 192 TypeScript tests, typecheck, six native GPU regressions, 38 stages/19 links and installed-Iris parser reproduction/repair checks pass. Full Minecraft load and visual retest remain pending. No provider call or deployment.

## v0.17.1 - 2026-10-25

- Add a separate authored OreGlow shader and paired material pack: mineral-only self-brightness from LabPBR specular alpha, strict ore-ID gating and a bounded screen-space halo. Keep host stone normally lit, clear emission on opaque occluders and retain underwater attenuation/far haze.
- Reuse the retained sunset04 water/sky algorithms. Ship 18 opaque albedo PNGs and 18 masked emission maps with exact 254 emission/255 no-emission handling. No dynamic light propagation, hidden-ore visibility or full PBR claim; the original shader-free pack stays unchanged.
- Add reproducible pair packaging, dependency/installation notes, two PNG/material tests and six native GPU regressions. The candidate is authored, not a billable AI response or a visually accepted model example.

Validation: 191 TypeScript tests, typecheck, six native GPU tests, 38 compiled stages/19 links, source validation and independent PNG decoding pass. Minecraft appearance/performance and Iris atlas/attachment integration still need owner acceptance. No provider call or deployment.

## v0.17.0 - 2026-10-25

- Add shader-free ore visibility textures for all 18 normal, deepslate and Nether ore variants on 1.21.1-1.21.11. Bounded brightness/outline recipes render real 16x16 PNGs while retaining opaque source pixels and unrelated host-stone details.
- Extend texture previews, short-prompt guidance, validation, ZIP packaging and an authored sample. Explicitly distinguish contrast from emission: no glow, lighting/fog bypass, hidden-ore visibility or transparency holes. Keep diamond-tool recolors working.
- Record the owner's successful live cherry-red tool-pack test and retain that prior pack. Add fixed ore masks, official source provenance and a reproducible extraction script.

Validation: 189 TypeScript tests, typecheck, production Next.js build, independent PNG decoding and local HTTP checks pass. Minecraft ore appearance acceptance and a fresh model-generated ore pack remain separate from offline fixtures. No billable model call or deployment.

## v0.16.0 - 2026-10-25

- Add vanilla diamond-tool recoloring for resource packs on 1.21.1-1.21.11. Bounded model-authored color recipes render as actual 16x16 PNGs with preserved vanilla alpha, silhouettes, wooden handles and shading. Recipes stay editable but are excluded from the installable ZIP.
- Add matching PNG previews, a short example prompt, accurate scope notices, pinned Mojang asset provenance and reproducible extraction/sample scripts. Worn armor, block textures and original art remain unsupported; no placeholder files are added to bypass validation.
- Verify PNG CRC/decompression and pixel preservation for all five tools, strict recipes/version/path rejection, ZIP contents and generation-to-storage behavior with an offline fixture.

Validation: 181 TypeScript tests, typecheck, production Next.js build and local creation/catalog HTTP checks pass. Authored sample is distinct from a live AI response. Minecraft visual acceptance remains pending; no billable provider call or production deployment.

## v0.15.1 - 2026-10-25

- Add authored sunset04 over retained water03: directional golden twilight, peach cloud edge light, stronger water highlights and sky-exposed ambient fill. Preserve dark interiors, optical coverage, reflection trace and waves.
- Add a reproducible builder and GLSL regressions for sunset contrast, outdoor/cave separation, unchanged day/deep-night response and water contracts. Previous candidates retained.

Validation: four native GPU tests pass; 38 stages compile and 19 programs link. Minecraft appearance/performance acceptance pending. No model call or deployment. Candidate not yet promoted as a visually accepted generator reference.

## v0.15.0 - 2026-10-25

- Integrate main's datapack generation, searchable examples and homepage media with all shader generation, reference, compiler and authored rendering work through v0.14.8. Preserve original commits through a regular merge.
- Resolve shared expert/validation/generation/status conflicts by retaining all five artifact types, dynamic ZIP dispatch, versioned datapack metadata and shader compiler/optional paid-repair boundaries. Keep both historical release records.
- Fix mixed source encoding revealed by the production compiler; add combined datapack/shader-gate and strict UTF-8 regressions. Record merge decisions and independent source review.

Validation: 174 TypeScript tests/typecheck and five native water regressions pass; production app/Cloudflare bundle and local HTTP/sample-ZIP smoke checks pass. No provider request or explicit production deployment. Live runtime, Minecraft visuals and payment flows remain outside these checks.

## v0.14.8 - 2026-10-25

- Add a separate authored GoldenHour water03 revision over the retained horizon02 sky. Replace mostly fixed water opacity with a coherent depth/angle-dependent reflection, scatter and neutral transmission layer; output straight RGB for the existing SRC_ALPHA overlay blend so reflections are not attenuated twice.
- Use view-ray bed separation, lit shallow/deep scatter and explicit missing-bed fallback. Retain sky/clouds, terrain light, reflection trace, wave normals, material mapping, glass path and far-horizon fade. Scalar absorption is not spectral transport or full underwater/refraction optics.
- Teach the water-layer budget in bounded generator context; add five native regressions and a guidance regression. Preserve previous candidates and document controlled visual acceptance checks.

Validation: five native regressions, 38 compiled stages/19 links, 165 TypeScript tests/typecheck and ZIP/source integrity pass. No new provider call or deployment. Minecraft appearance/performance remain unverified.

## v0.14.7 - 2026-10-25

- Preserve the tested GoldenHour checked source and add a reproducible local horizon02 revision. Remove a measured lower-sky branch discontinuity; share render-distance haze between terrain and water, including far-water alpha, while preserving near glass/underwater transparency.
- Refine bounded 2D cloud shapes and directional density contrast, disable duplicate vanilla clouds, enlarge the stylized sun and restrain sunset saturation. Slightly lift deep-water tint; retain reflection/wave algorithms and block lighting. No new texture assets or volumetric-cloud claim.
- Teach continuous horizon blends, viewing-sky/alpha agreement, runtime viewport uniforms and true world-up. Add five native regressions using retained actual GLSL and a context regression. Document screenshot evidence and limitations separately from compiler success.

Validation: 164 TypeScript tests/typecheck, five native regressions, 38 compiled stages/19 linked programs and archive/source integrity pass. Synthetic tests are not Iris scene/visual acceptance. No new provider request, production deployment or automatic visual evaluation.

## v0.14.6 - 2026-10-25

- Audit the unchanged AmberglassReflections short-prompt/two-image output: real SSR is present, but clouds retain vanilla shapes, sky changes are restrained, and lighting/space semantics need work. Document source evidence, screenshot limits and a controlled next test without claiming a model comparison or visual acceptance.
- Add bounded source-linked warnings for sampled vanilla lightmap RGB used as independent light levels and view-space sun direction dotted with fixed camera-up. Review implemented and approximation features; preserve downloadable source, historical reports and no-surprise-paid-retry behavior.
- Teach reference appearance gaps, lightmap semantics, common-space shadow offsets, stationary wave phase and coherent sky fallback. Retain original GLSL regression fixtures. No repair to the downloaded pack, new model call or deployment.

Validation: 163 TypeScript tests and typecheck pass. Unchanged downloaded source compiles 16 stages/8 links. Warnings are lexical review hints, not whole-program data-flow analysis or proof of visual fidelity. Live texture generation and automated render/compare/revise remain unavailable.

## v0.14.5 - 2026-10-24

- Add BlocksLab06 following candidate05 game feedback: bounded angular cloud coordinates replace the near-horizon planar projection, producing broader cloud clusters. Enlarge the stylized sun disc and reduce horizon radiance and distance haze, with less sunset amplification.
- Preserve materials04, block lighting/exposure, water algorithms, underwater fog and far-distance fade. Reflections follow the revised sky/atmosphere. Record the feedback and limited 2D technique in generator examples.
- Add actual-GLSL solar footprint, background/translucency and source-isolation tests; export a labelled synthetic preview. New appearance still needs Minecraft acceptance; clouds are not volumetric and have limited parallax.

Validation: three candidate06 native tests, 22 compiled stages/11 links, 157 TS tests and typecheck pass. ZIP/source integrity checked before local installation. No paid provider request, production deployment or live binary texture generation.

## v0.14.4 - 2026-10-24

- Add BlocksLab05: explicitly fill clear-depth sky in the opaque snapshot and composite before translucent mixing. A native GPU probe reproduces candidate04 returning white from a white scene input; candidate05 renders its own sky independently of that input.
- Add bluer daytime, soft 2D clouds and continuous warm sunset. Preserve current BlocksLab04 material assets, block lighting and exposure. Water algorithms are unchanged; reflected sky/fog colours follow the revised helper.
- Teach explicit sky ownership to generator context and add four native regression tests plus a synthetic day/sunset/night preview. Owner retains current grass/leaves; new sky needs Minecraft acceptance.

Validation: 157 TypeScript tests/typecheck and four native sky tests pass; 22 stages compile/11 programs link. Archive/source integrity checked before local installation. Synthetic GL evidence is not an Iris trace, visual acceptance or performance proof. No paid request or deployment. Live binary texture generation remains unavailable.

## v0.14.3 - 2026-10-24

- Add BlocksLab04 finer oak/spruce/birch foliage, stronger vein pigment, tufted ground grass/fringe, and original short/tall grass sprites. Tall-grass colour/height/alpha and normals are baked continuously before splitting into block halves.
- Extend plant material coverage and add restrained, existing-shadow-gated directional vegetation backlighting; this is not true subsurface scattering. Preserve bark, sand, unrelated materials, and water/sky algorithms. Geometry and wind are unchanged.
- Expose optional foliage detail controls while preserving candidate03 defaults. Add grass/foliage periodicity, cutout/coverage, sampled PNG, tall-grass join/normal and isolation regressions. Document the installed official model path verification and scoped visual checks.

Validation: 157 TypeScript tests/typecheck, five grass/foliage tests and five candidate03 material regressions pass. Candidate04 compiles 22 stages and links 11 programs; archive entries match source before local installation. Appearance, plant shadows and performance still need in-game acceptance. No provider request, deployed binary generation or production deployment.

## v0.14.2 - 2026-10-24

- Add BlocksLab03: replace oak/spruce/birch barcode-like bark with irregular plates, interrupted fissures and localized knots/scars. Add fine species-specific oak/spruce/birch leaf cutouts with biome tint and correlated surface maps.
- Extend only the companion material-ID range; preserve alpha-tested geometry/shadows, water/sky/lighting algorithms, sand and unrelated candidate02 assets. Leaves retain cubic geometry; no wind or true subsurface scattering is claimed.
- Add reproducible bark/foliage builder and tests for periodicity, reduced full-height stripe structure, leaf alpha coverage, neutral/non-black RGB, sampled material/normal agreement and source isolation. Document the target version's See-Through Leaves setting.

Validation: 157 TypeScript tests and typecheck pass; five bark/foliage tests pass. Candidate03 compiles 22 stages and links 11 programs. ZIP/source integrity verified before local installation. New appearance and client rendering remain unverified; no paid AI request or deployment. Live binary texture generation remains unavailable.

## v0.14.1 - 2026-10-24

- Expand the separate BlocksLab02 resource/shader pair with dirt, coarse dirt, gravel, biome-tinted grass top/side fringe, spruce/birch planks, and oak/spruce/birch log bark/end grain. Include wood blocks and matching plank stairs/slabs in material-ID coverage.
- Preserve candidate01 sand/stone/oak-plank PNGs byte-for-byte and retain water, sky and lighting algorithms. New material fields share correlated normals and smoothness maps; gravel uses rounded pebble masks with finer aggregate gaps.
- Record positive owner feedback for candidate01 sand separately from unverified new materials. Add reproducible builders, periodicity/encoding/grass-alpha/unique-ID/isolation checks, and candidate02 packaging. Live binary texture generation remains unavailable.

Validation: 157 TypeScript tests, TypeScript checking, five original material tests and five expansion tests pass. BlocksLab02 compiles 22 stages and links 11 programs. Archive/source integrity checked before installation. New materials still require in-game visual acceptance; no paid generation or production deployment.

## v0.14.0 - 2026-10-24

- Add separate authored BlocksLab01 and CleanSkyLab01 examples; Aurora candidate03 remains the owner's water baseline. Block materials provide original periodic 512px sand, stone and oak-plank albedo/normal/smoothness assets plus a dielectric material decoder. CleanSky changes only the shared sky function, not the inherited water algorithm.
- Add reproducible asset/candidate builders, isolated shader packaging and a component-specific acceptance guide. Normal/height fields are correlated; other block assets remain vanilla. No POM/displacement, full LabPBR compliance, photo-scan quality or visual acceptance is claimed.
- Teach the generator that non-pixelated blocks need real material assets, not tone mapping alone. Disclose the text-only live generator boundary and keep experimental examples distinct from owner-accepted water evidence. The live app does not yet generate binary textures.

Validation: 157 TypeScript tests, five material/isolation tests, eight native regressions, typecheck and Cloudflare build pass. Both candidates compile 22 stages and link 11 programs. Material tests check periodicity, stored-channel constraints, deterministic assets and source isolation. In-game appearance and performance remain pending; no paid provider request was made.

## v0.13.4 - 2026-10-24

- Keep one included uniform owner when a legacy stage redundantly declares the same simple uniform. Cleanup is bounded, preserves source line positions and shared consumers, and is disclosed in the project message. Conditional/macro code, conflicting types, complex declarations, repeated owners and uses before the retained owner remain compiler concerns.
- Teach the concrete root-versus-lighting-include lightmap conflict. Add regression coverage for ownership, preprocessing boundaries, stage independence, idempotence, retained history and native duplicate failure/single-owner success.
- Two short-prompt, two-image Luna High UI requests cost seven settled credits total: SundownReflections compiled unchanged; GoldenLakeIrisSunset exposed one duplicate uniform. Applying this cleanup offline changes only gbuffers_water.fsh and compiles 22 stages/11 links. No extra provider repair was requested; original failed history remains intact.

Validation: 156 TypeScript tests, eight native driver regressions, TypeScript checking and Cloudflare build pass. The corrected local candidate still needs Iris/in-game visual acceptance; compiler success does not establish reference fidelity or general generation reliability.

## v0.13.3 - 2026-10-24

- Warn when four known GLSL runtime constants are placed in shaders.properties, without rejecting usable source or triggering paid repairs. Compilation does not establish that property assignments configure Iris.
- Teach correct shadow-option declaration locations/types and shadow-pass matrix ownership. Skill library 1.0.3 adds option documentation and a measured first-pass case, bringing reference records to thirteen.
- Record the controlled short-prompt SundownReflections UI pass: 20 stages/10 links, unmodified generated ZIP and three settled credits. Source review still found misplaced options; visual acceptance remains pending.

Validation: 150 tests and TypeScript pass; Cloudflare build passes. Misplaced-setting warnings preserve exact source and ignore comments/ordinary properties. One real Luna High pass succeeded natively without repair; this is not a rendering test or reliability estimate.

## v0.13.2 - 2026-10-24

- Teach vertex-only attribute ownership versus shared stage varyings and parsed block-comment format metadata. Add the retained EmberlightLake failure as reference eleven in skill library 1.0.2.
- Add native regression cases reproducing a shared attribute leaking into fragment compilation and verifying vertex-owned declarations with matched varyings.
- Preserve the original generated output and package a separate manual EmberlightLake repair without replacing app history or changing paid repair limits.

Validation: 149 TypeScript tests, six native driver regressions, TypeScript checking and Cloudflare build pass. Original output reproduces six failed programs; manual repair compiles 22 stages and links 11 programs. Validated ZIP installed separately in Downloads and both local shader-pack folders. In-game appearance remains unverified; no paid repair was made.

## v0.13.1 - 2026-10-24

- Constrain shader response names to the shared project identifier pattern and give matching instructions.
- Convert ordinary shader titles into safe bounded archive labels before validation, including classic provider replies. Preserve all source/path bytes and leave plugin/mod names and classes untouched.
- Keep unusable, control-containing and excessive titles invalid; reject trailing whitespace in project identifiers. Do not fabricate missing code or make another paid call for title conversion.

Validation: 149 tests and TypeScript pass; Cloudflare build passes. All four mocked providers handle human-readable titles. Coverage includes accents, numeric prefixes, length limits, valid-name preservation, source equality, immutability, invalid titles and non-shader isolation. No paid retry or visual acceptance was performed; previous discarded source is not recovered.

## v0.13.0 - 2026-10-24

- Give shader provider responses four explicit required source fields for the root terrain/cloud vertex and fragment stages. OpenAI strict output and Gemini schema requests now use this shader-specific contract; other response modes receive matching instructions.
- Normalize model-authored required source into the existing file-list format without inserting a preset or synthesizing missing code. Reject empty/missing values, unknown keys and duplicate required paths. Keep complete classic responses readable for legacy/custom providers and enforce normal validation afterward.
- Share required paths with validation and count the actual artifact schema in input estimates. Missing-stage errors enumerate all missing paths without assuming a composite-only renderer. Non-shader response formats and paid call counts are unchanged.

Validation: 148 tests and TypeScript pass; Cloudflare build passes. All four mocked adapters round-trip model source for a one-sentence request. Schema requirements, exact source preservation, ordering, duplicate/missing/unsafe fields, old response compatibility and existing shader validation are covered. No paid retry, native rendering or visual acceptance was performed; schema presence is not shader correctness.

## v0.12.2 - 2026-10-24

- Share the supported executable shader filename catalog between generation guidance and validation, preserving the existing accepted layout.
- Explicitly teach that render-layer labels do not create shader entrypoints. Reject unsupported terrain_cutout_mip/mipped names with a terrain_cutout hint and source-review requirement; never blindly rename or merge passes.
- Record the owner's failure in pipeline skill library 1.0.1, supported by Iris documentation and the installed Iris 1.10.8 / Minecraft 1.21.11 ProgramId class.

Validation: 143 tests and TypeScript pass; Cloudflare build passes. Every catalog gbuffers name matches validation; invented mip variants fail without rewriting source, packaging an artifact or making another model call. No paid retry or in-game acceptance was run; the original rejected response was not retained as a completed pack.

## v0.12.1 - 2026-10-24

- Raise Luna shader output headroom to 64,000 tokens for reasoning plus complete source. Keep other shader models at 32,000 and non-shader requests at 16,000; shared model-aware quotes/reservations account for the same ceiling.
- Add safe numeric OpenAI incomplete-response diagnostics for reported output/reasoning tokens and received project-text length. Never expose partial source or reasoning, package incomplete output or initiate an automatic retry.
- Document the owner's 32,000-token stop without inventing its missing reasoning/code split. A larger cap is headroom, not proof of better rendering or guaranteed completion.

Validation: 141 tests and TypeScript pass; Cloudflare build passes. All provider ceilings match quotes/reservations; safe diagnostics cover missing/malformed usage and private source exclusion. No paid provider call or in-game acceptance was performed.

## v0.12.0 - 2026-10-24

- Add a versioned shader specialist library with five roles, ten documented reference records, alternative methods, failure/correction pairs and concrete acceptance scenes.
- Include selected skill cards and distilled reference lessons in all four provider payloads. Image-led requests receive all five; text requests route relevant cards plus pipeline engineering. Keep exact Iris 1.21.11 profile gating and a 16,000-character whole-card budget.
- Distinguish reviewed documentation, limited local observations and unverified new output. Count selected context in credit estimates; add no runtime fetches, model agents or extra paid passes.
- Document how to add annotated visual references, genuinely different styles and measured evidence. This release adds no visual gallery or permanent model training.

Validation: 140 tests and TypeScript pass; Cloudflare build passes. Routing, source provenance, budget, incompatible-profile withholding and all four mocked image/provider payloads are covered. No paid generation or new in-game quality evaluation was performed.

## v0.11.6 - 2026-10-24

- Give image-led shader requests all five engineering guidance modules even without effect keywords. Explicit constraints override inferred image cues; optional code examples stay text-ranked and bounded.
- Ask for visual goals, algorithms, pass/buffer contracts and declaration ownership before coding. Require concrete fixed-camera acceptance instructions in README using the existing plan schema.
- Scope reflection evidence to cited source and transitive includes. Flag unrelated/comment-only buffers and declaration-only claims without discarding source or adding model calls.

Validation: 137 tests and TypeScript pass, including actual image blocks and shared design guidance across all four mocked adapters. Cloudflare build passes. No paid generation or in-game comparison was run. Lexical warnings cannot prove a working algorithm or fully resolve sampler aliases; visual quality remains unverified.

## v0.11.5 - 2026-10-23

- Add a hidden native celestial-blending probe using the actual fragment source and declared blend factors in an offscreen float framebuffer. Verify black borders, dark halos, bright texels, alpha fading and fully transparent texels against a preserved sky background.
- Teach generation to audit sun/moon compositing separately from ordinary material transparency. Black RGB with opaque alpha must not replace the sky; additive celestial contribution is one supported approach, not a policy for water/glass.
- Preserve the failing Amberwater repair-01. A separate manual repair-02 changes only its celestial fragment/blend contract and README and is installed under a new name; no generated shader is silently substituted.

Validation: Cloudflare build passes. 134 TypeScript tests, TypeScript checking and four native driver regressions pass. The actual repair-01 fails four of five celestial blend cases; repair-02 passes all five and compiles 28 stages/14 links. The app validator and ZIP packager pass. Full Iris appearance remains pending; no paid provider call was made.

## v0.11.4 - 2026-10-23

- Teach shared uniform/helper/settings ownership during shader generation. Explain that separate include guards do not prevent duplicate declarations across different libraries.
- Add a compiler-repair checklist to the actual provider payload: inspect transitive includes, repair the owning declaration, check all consumers and preserve working passes instead of redesigning the renderer. The shared token estimator counts this additional repair context.
- Preserve the one-repair limit, credit authorization and native compile gate. This is context guidance, not a deterministic source-rewriting pass or a claim that model errors cannot recur.

Validation: Cloudflare build passes. 134 tests and TypeScript pass, including all four adapters receiving the exact current source, diagnostics and targeted checklist with matching input estimates. The owner's AmberwaterIris automatic repair still fails two programs; a separate offline manual repair passes 28 stages/14 links and is installed separately. No additional paid provider call or visual acceptance was performed.

## v0.11.3 - 2026-10-23

- Raise shader provider response envelopes from 400,000 to 2,000,000 bytes across all adapters, allowing escaped project JSON and provider metadata without increasing source or output-token limits. Other artifact envelopes retain 400,000 bytes.
- Allow 600,000 bytes for compiler diagnostic JSON, accounting for escaping of the already bounded raw compiler output. Raw compiler output, line counts and execution limits remain unchanged.
- Replace generic size errors at these boundaries with explicit AI-provider transport versus local compiler diagnostic messages, including the configured byte limit. Fail closed and never auto-retry an oversized response.

Validation: Cloudflare build passes. 133 tests and TypeScript pass, including all four adapters with a valid 500 KB envelope, byte-based over-limit rejection, unchanged non-shader bounds, source-limit rejection, escaped compiler diagnostics and no hidden retries. The owner's original generic error did not identify its boundary; no raw failed response was retained. No paid retry or new visual acceptance was performed.

## v0.11.2 - 2026-10-23

- Allow each shader provider pass up to 600 seconds in configured localhost development, following the owner's 240-second timeout on High reasoning. Hosted shader requests retain 240 seconds and other artifact deadlines are unchanged.
- Preload a development-only non-retrying HTTP dispatcher so a lower native fetch headers/body timer cannot undercut the local shader deadline. Request AbortSignals still enforce shorter service deadlines. Give the local Next proxy and generation route declaration 1,500 seconds for two bounded passes plus compiler checks; hosting may enforce lower limits.
- Keep output budgets, per-pass credit settlement/refunds and explicit optional repair authorization unchanged. No automatic retry or paid generation is added.

Validation: Cloudflare build, local restart/status and create-page checks pass. 131 tests and TypeScript pass, including all provider deadlines, no retry on timeout, delayed HTTP headers, shorter explicit aborts, and Node child-worker preload. No paid retry or completed High-reasoning shader result was produced by Codex.

## v0.11.1 - 2026-10-23

- Raise shader pipeline descriptions from 300 to 2,000 characters each and allow up to 16 steps. Expand goal, reference-summary, technique and limitation text so detailed planning does not hit the former small caps.
- Default new shader selections and requests with omitted effort to High reasoning, respecting explicit effort choices and leaving other artifact defaults alone. Actual quotes/reservations use the selected level; no artificial waiting or minimum code length is added.
- Allow 60 shader files instead of 30 and 80,000 characters per shader file instead of 40,000. Retain the 150 KB total source, 32,000 output-token and request-size bounds.
- Remove the context instruction to apply only one or two visual layers first; encourage complete interacting effects, source/interface audits and appropriate implementation depth. High reasoning receives up to four relevant engineering modules; examples remain optional and bounded.

Validation: Cloudflare build, TypeScript and mocked desktop/mobile controls pass; 129 automated tests cover long plans, source/count/total boundaries and explicit reasoning overrides. No paid generation or new visual acceptance was run. More reasoning and implementation room do not guarantee reference fidelity.

## v0.11.0 � 2026-10-23

- Check generated shader stages and links with a private Windows raw-driver service during configured local preview, before ZIP packaging. Failed checks retain source and diagnostics with failed status and no installable ZIP.
- Offer one optional compiler repair, off by default. Show the extra credit limit before submission and enforce the actual repair reservation against that limit before any paid call. Recompile once; no further repair, preset fallback or retry on compiler infrastructure failure.
- Launch the loopback checker with an ephemeral server-only token, source validation, bounded requests/output, one active job and a separate compiler process with a deadline and no provider credentials. Public/production compilation remains disabled.
- Display local compiler availability and explicit in-game testing limits. Hosted generation remains static-check-only. Native compilation is not evidence of realism, correct Iris bindings or acceptable FPS.

Validation: 126 automated tests and TypeScript pass. The actual original Emberlake source fails with its missing functions/duplicate uniform/missing varying; the separate manual repair passes 20 stages and 10 links through the new service runner. Cloudflare build and mocked desktop/mobile controls pass; localhost reports the compiler configured and Luna available. No paid model call or new visual acceptance was performed.

## v0.10.1 — 2026-10-23

- Increase shader output budgets from 16,000 to 32,000 tokens using one shared provider/credit-reservation ceiling. Other artifacts remain at 16,000. The displayed maximum hold grows for shaders; actual-usage settlement and failed-attempt refunds are unchanged.
- Handle explicit incomplete, length-limit and refusal/filter results before project parsing. Join OpenAI response text segments in order rather than parsing only the first segment; keep reasoning/tool blocks out of project JSON.
- Distinguish empty text, malformed project JSON, unsupported response envelopes, source-check failures and internal validation errors. Avoid raw source/body leakage in diagnostics; development warnings contain only model ID, character count and configured limit.
- Raise the bounded provider-envelope limit to 400 KB in bytes while retaining the 30-file/150 KB source limits. Do not add hidden retries or recover incomplete code into a downloadable artifact.

Validation: 121 tests and TypeScript pass, including all adapter output caps versus quotes/reservations, valid-looking truncated responses, split output, refusals, safe diagnostics and byte-size rejection. Cloudflare build passes. The owner's previous generic JSON failure ran about 2.3 minutes; its response was not retained, so its exact cause remains unconfirmed. No paid retry or new shader visual acceptance was performed.

## v0.10.0 — 2026-10-23

- Restore complete GLSL project generation for all shader requests and historical foundation follow-ups. Remove automatic eight-control schema/input/parser routing and fixed-source substitution; old projects send their full current source and remain editable.
- Supply bounded, target-aware authored engineering examples with dependency/evidence limits. Examples are optional techniques, not a required renderer or visual style. Add focused cel-shading/outline guidance and require plan-first complete source rather than settings-only responses.
- Reject reachable include cycles and clear literal output-slot/routing mistakes while preserving valid shared includes, composite ping-pong and compiler-dependent conditional/modern outputs. Align spaced include directives with missing-file checks.
- Keep one paid pass, full image transport, source-linked feature reports and actual-context quotes. No extra automatic repair calls, preset fallback or generated-output GPU-verification claim.

Validation: 116 tests and TypeScript pass, including all four adapters, new/custom GLSL, full historical follow-ups, settings-only/static-failure rejection without extra calls, bounded examples and source contracts. Cloudflare build passes. No paid model generation or new in-game visual acceptance was performed. Native per-output compilation/repair remains a later step.

## v0.9.1 — 2026-10-23

- Document `npm run local:preview` as the configured local launcher: it loads ignored provider settings from `.dev.vars`, whereas bare `npm run dev` can expose only demo mode when no provider environment is loaded.
- Require versioned release commit titles and bodies describing changes, validation and limitations, alongside the existing dated changelog and annotated tags. Preserve already-pushed history.
- Update the README release pointer and distinguish historical prototype notes from current guides. Local credentials, account balances and credit grants remain outside Git.

Validation: TypeScript passes; local `/api/status` confirms Luna enabled and the AI connection ready after using the configured launcher. Documentation/workflow release only; no application runtime change or new production deployment.

## v0.9.0 — 2026-10-23

- New Iris 1.21.11 requests interpret reference images into eight bounded look controls, then assemble the pinned original AuroraHorizon candidate03 renderer. All four provider adapters use the same one-pass specification, capability context and evidence limits; no renderer rewrite or automatic retry is needed.
- Recognize follow-ups by reconstructing and comparing every canonical source file. Preserve unknown/custom shader projects on the existing full-source edit path; reject invalid settings without changing prior work. Other targets/versions retain their current generator.
- Display all model-reported unmet requests in the shader feature plan and README. Disclose accepted candidate02 water evidence, experimental candidate03 terrain and absent per-output Iris/GPU testing. Keep model prose out of executable source and derive renderer feature claims from pinned source.
- Include compact context/schema/images in input estimates and count only returned model text in missing-usage output estimates. Add reproducible source snapshot syncing and document the integration as context/code reuse, not model training.

Validation: 107 tests, TypeScript and Cloudflare build pass. Default/minimum/maximum/zero-effect assembled variants compile 88 native GLSL stages and link 44 programs with no failures on one NVIDIA driver. Mocked desktop/mobile checks cover actual image upload, quote/submission parity, new/follow-up flows, all 12 unmet items, no attachment persistence, no browser errors or overflow. No paid model calls or new in-game visual acceptance were performed.

## v0.8.0 — 2026-10-23

- Add candidate 03 terrain materials: category-based roughness/metal response, shadow-gated highlights and bounded near-camera texture-brightness normal detail. Expose two controls; keep the owner's accepted water and post-processing source intact.
- Guard highlight view/half vectors and evaluate detail derivatives before cutout discard. Preserve geometric normals for shadow bias and keep the original shared lighting path unchanged.
- Document that inferred relief/material categories are approximations, with true PBR maps, full category coverage and in-game visual/FPS acceptance still outstanding. Keep the experimental foundation outside live AI generation.

Validation: 101 tests and TypeScript pass; all 22 native GLSL stages/11 programs compile/link without shims. Two native format regressions pass. Extended synthetic GPU probes verify finite material outputs, stronger metal/stone highlight separation, shadow gating and unchanged original lighting cases. Source hashes preserve the accepted water/post-processing programs. Candidate 03 packages separately for owner testing.

## v0.7.1 — 2026-10-23

- Fix Aurora Horizon's RGBA16F declarations using Iris's documented block-comment metadata form. Preserve candidate 01 and package candidate 02 separately.
- Remove automatic format-token definitions from the native GLSL checker; they masked the exact undefined-name error observed in Iris. Add two native-driver regression tests covering the failure and corrected form.

Validation: strict native compilation/linking passes all 22 stages/11 programs without injected definitions; synthetic lighting still passes. All 100 TypeScript tests, TypeScript checks and candidate packaging pass. Candidate 02 still requires an actual Iris render test; the renderer remains outside live AI generation.

## v0.7.0 — 2026-10-23

- Add Aurora Horizon candidate 01, an original experimental Iris 1.21.11 shader foundation with directional block lighting, filtered cast shadows, long-range screen-space water reflections, procedural sky/clouds, depth haze/contact shading and HDR highlight bloom.
- Include a documented pass/buffer/colour-space contract, bounded look controls, explicit limitations and an in-game promotion checklist. Keep the candidate separate from live AI generation until runtime acceptance.
- Add reproducible ZIP packaging through the existing source validator, hidden native-driver GLSL compile/link tooling and a synthetic GPU lighting probe using Python's standard library. No provider request, visible helper window or third-party compiler install.

Validation: 100 tests and TypeScript pass; the 30-file candidate packages without source normalisation or report warnings. RTX 3070 driver compiles all 22 stages and links 11 programs; a controlled offscreen probe confirms directional lighting, shadow attenuation and retained blocklight. Iris integration, actual scene appearance, material preservation and FPS remain pending owner testing. This release adds offline source/tools; it does not deploy or automatically inject the experimental renderer into provider context.

## v0.6.3 — 2026-10-23

- Teach explicit fragment output routing and GLSL buffer-clear declarations after StillwaterGloam rendered a white screen in the owner's Iris test.
- Water/reflection guidance now includes a deferred opaque snapshot into colortex4, safe gbuffers sampling, a transparent-cleared overlay, and consistent output-index/attachment and alpha conventions. Explicitly forbid scene-colour reads from colortex0–3 in Iris gbuffers stages.
- Keep the correction as generation guidance; no blind source rewriting, additional model call or GPU-verification claim. A separate manually repaired original test pack is preserved outside the repository for owner retesting.

Validation: 99 tests, TypeScript and Cloudflare build passed. The separate 22-file repair candidate passes structural validation; its in-game rendering remains unverified.

## v0.6.2 — 2026-10-23

- Treat shader feature citations as report metadata: existing shaders/*.properties files are valid supporting citations, and missing/unsupported citations produce visible warnings instead of discarding the generated pack.
- Display "Claim needs review · untested" for implemented claims with report warnings. Missing conventional shadow/reflection prerequisites also become report warnings; executable source/include/path checks remain blocking.
- Preserve the original plan in source/ZIP and rederive warnings from files, including restored projects. No additional model request or automated paid retry.

Validation: 99 tests, TypeScript, isolated desktop/mobile browser checks and Cloudflare build passed. Checked one-call packaging, supporting files, unresolved paths, warning visibility and unchanged rejection of missing executable includes. No paid generation or GPU test was performed.

## v0.6.1 — 2026-10-23

- Automatically remove standalone, correctly typed redundant built-in matrix uniform declarations in GLSL 110/120 stages before shader validation. Preserve uses and line numbers and disclose the cleanup in the response; no additional model call.
- Keep core/modern profiles, shared includes, mismatched types, unknown reserved names and complex declarations unchanged. Remaining reserved-input failures now identify the variable and source line.
- Strengthen generation guidance with a concrete built-in declaration example. This is a narrow compatibility cleanup, not GLSL compilation or a guarantee of visual quality.

Validation: all 98 tests and TypeScript checks passed, including single-call packaging after cleanup, idempotence, source preservation and unsupported-case rejection. Cloudflare build and live smoke checked before release. The user's rejected source was not retained, so its exact variable could not be recovered; another generation is needed for the real acceptance test.

## v0.6.0 — 2026-10-23

- Shader generation now uses focused sky, lighting/shadow, water/reflection and atmosphere modules, plus reference interpretation and follow-up preservation guidance.
- Require a source-linked shader-plan.json with a reference brief, pipeline decisions and implemented/approximate/omitted features. The workspace exposes those statuses as model reports, with compilation and visual appearance explicitly unverified.
- Catch reserved built-in declarations, direct floating-point preprocessor conditions and missing conventional shadow/scene-reflection prerequisites. Old projects remain editable.
- Keep the workflow within one model call; no automatic paid analysis/repair loop or pricing change. Quotes use the assembled context.

Validation: 96 tests, TypeScript checks and the Cloudflare production build passed. Fixture browser checks passed for feature/omission visibility, images, quotes, follow-ups and mobile layout; no paid model call. Actual compilation, reference matching and model-quality improvement remain unverified. See docs/shader-generation-workflow.md.

## v0.5.0 — 2026-10-23

- Reference images and supported text files now reach the selected model for new projects and follow-up edits; the follow-up composer has attachment controls and previews.
- Validate upload names/types, inline image headers/dimensions, file count and byte budgets. References are transient, treated as untrusted data and excluded from stored project history and downloads.
- Quote the composed context plus image allowance, show attachment-inclusive estimates and retain provider-reported usage for settlement. No additional model pass, automatic retry or pricing change.
- Image guidance converts visible features into a prioritised brief and distinguishes observations, approximations and omissions, following the supplied shader research.

Validation: 90 automated tests, TypeScript checks and the Cloudflare production build passed. Isolated browser checks passed for create/follow-up images, quotes, resizing, history exclusion and mobile layout. No paid model call made; live image interpretation and shader fidelity remain unverified. See docs/reference-attachments.md.

## v0.3.4 — 2026-10-23

- Shader provider requests now allow four minutes for generation instead of the 90-second OpenAI/Anthropic or three-minute Gemini deadlines. Other artifact deadlines are unchanged.
- Timeout errors explain that no completed project was received and suggest reducing scope or reasoning. No automatic retry or extra model call was added; the existing credit-reservation refund path remains in use.

Validation: all 85 automated tests, TypeScript checks and the Cloudflare production build passed. Provider regression coverage uses simulated timeouts without paid API calls. A successful GoldenHorizon generation remains unverified.

## v0.3.3 — 2026-10-23

- Expanded shader generation context using WarmHorizon runtime-test findings: explicit terrain/cloud coverage, texture/lightmap/alpha handling, deliberate fallback programs, correct settings placement and preservation checks for the rest of the world.
- Reject incomplete shader output before ZIP download with specific diagnostics for missing baseline programs, orphan stages, invented names, missing entry declarations and unresolved includes. Older failed projects remain editable; regenerated output must pass the new rules.
- Added shader regressions and provider-to-ZIP coverage. No automatic model retries or additional billable passes were added. Static validation does not establish GPU correctness; a fresh generation and in-game acceptance remain required.

Validation: all 84 automated tests, TypeScript checks and the Cloudflare production build passed. No paid generation was replayed; a fresh model-generated pack still requires in-game acceptance. See docs/shader-quality.md for scope and limitations.

## v0.3.2 — 2026-10-22

- Fixed private-preview sign-in using the hosted return address from Cloudflare development bindings. The local launcher now provides a separate development-only origin, checked against the actual loopback Host and port even when Next normalizes the request URL.
- Documented the exact Supabase local sign-in and reset redirect URLs. Hosted redirect behavior is preserved.

Validation: 76 automated tests and TypeScript checks passed. The running local Google sign-in endpoint now requests `http://127.0.0.1:3215/auth/callback`. Supabase dashboard sign-in and local redirect allow-list setup remain owner steps; end-to-end Google login has not yet been verified. No paid generation was replayed and the live deployment is unchanged.

## v0.3.1 — 2026-10-22

- Verified the private Paper 1.21.4 compiler on Docker Desktop: prepared the pinned toolchain image, compiled a real Java21 JAR offline, rejected broken Java and confirmed forced-deadline container removal.
- Verified the generation/build adapter over authenticated local HTTP using disposable test credentials and the fixed example provider. No paid AI call was made; the existing HealHorizon source was not available in the connected browser.
- Fixed Windows credential-helper discovery after a fresh Docker installation, CommonJS execution of the compiler check, and whitespace/quoted provider settings in the local preview launcher.
- Added repeatable HTTP/deadline acceptance commands and environment-isolation regression coverage. Local preview and builder are running on loopback; the live Cloudflare site remains v0.2.3.

Validation: 75 automated tests and TypeScript checks passed; actual JAR contents/Java21 bytecode inspected, compiler-error build passed, HTTP pipeline reported success, forced timeout removed its job, and no job containers remained. No Minecraft gameplay test has been run. Only Paper1.21.4 is provisioned for local compilation.

## v0.3.0 — 2026-10-22

- Added a private loopback-only Paper 1.21.4 build-service implementation, trusted Docker image preparation and an offline compilation smoke-check command.
- Added authenticated, size-limited, single-job HTTP handling and disposable nonroot Docker jobs with no network, app secrets or host mounts; generated Gradle scripts are rejected.
- Added local setup and preview launchers. The local app uses its own billing database and builder settings; the hosted site is not connected to the PC.
- Restricted build context to immutable template/runner files and pinned the Gradle/Java image digest. Added repeated source validation, resource/output/deadline controls and bounded abnormal-container cleanup.

Validation: 73 TypeScript tests, three Python validation tests, TypeScript checks and the application production build passed. Docker is not installed/running on the development PC, so image preparation, real offline JAR compilation and container cleanup acceptance remain unverified. Automatic approval review blocked installer execution; the owner must install and finish Docker Desktop setup. This is a prepared private-testing implementation, not a working public compiler. Live Cloudflare remains on v0.2.3.

## v0.2.3 — 2026-10-22

- Fixed generation failing on Cloudflare before reaching the AI provider because Workers rejects the Fetch API's error redirect mode.
- AI and isolated-build requests now use manual redirects and reject redirect responses before credentials can be forwarded.
- Added regression coverage for all three AI providers, build requests, redirect rejection and successful service responses.

Validation: all 69 automated tests and the production Cloudflare build passed. Deployed Worker fac03373-d001-4e29-bfb6-198c583cb849. Confirmed the failed attempt refunded its 2-credit reservation; no paid generation was replayed during this fix. This fix does not configure the Java build service; compiled plugin/mod JAR acceptance remains outstanding.
## v0.4.0 — 2026-10-23

- Connected datapacks across generation, the artifact catalog, saved projects and both workspaces. Added namespaced text-file/JSON/function-tag validation, version-aware directories and ZIP packaging with pinned metadata for 51 Java releases from 1.13 through 26.3.
- Added installation guidance and a fixed hello-world datapack download that needs no AI provider, account or credits. Custom generation retains the existing provider, account and credit requirements.
- Added 30 searchable, filterable prompt examples across plugins, mods, datapacks, resource packs and shaders. Example links preserve their intended version, type and prompt; the standalone preview preserves sample-download links.
- Faded the hero video into the shared starfield to remove the solid horizontal transition, softened the closing video to 12% opacity and retained the original video files and real screenshots.

Validation: all 74 automated tests, TypeScript, production Next.js, Cloudflare and standalone HTML builds passed. Local HTTP checks verified the five image cards, example library, catalog, primary pages/media and readable sample ZIPs for 1.13, 1.21.4, 1.21.11 and 26.3; pre-1.13 downloads return 400. Served CSS confirms the transparent hero fade and closing-video opacity. Browser layout review and Minecraft runtime testing were unavailable; no live AI generation or deployment performed. Local production server restarted on port 3215. Used the next unused minor version because the v0.3.x tags already exist.

## v0.2.4 — 2026-10-23

- Replaced the homepage carousel with four visible creation cards, distinct category icons and real Minecraft screenshots sourced from Wikimedia Commons and Modrinth, with author and licence links. Existing hero and closing videos are unchanged; no generated artwork was added.
- Consolidated repeated platform lists into the compatibility section, reduced the feature grid to three benefits and grouped extra example prompts under an expandable panel.
- Simplified navigation and creation actions, improved mobile heading sizes and keyboard focus, and removed the unsupported datapack creation link and claim.
- Regenerated the standalone HTML preview and preserved its local image, video and credit links.

Validation: all 67 automated tests, TypeScript, production Next.js, Cloudflare and standalone HTML builds passed. Local HTTP checks passed for the homepage, creation/account/pricing pages, all four category images, existing video and image credits; homepage IDs are unique. Source images were visually inspected. Browser layout review was unavailable because this session has no connected browser. No deployment performed.

## v0.2.2 — 2026-10-22

- Preserved the teammate release as the functional baseline while keeping the redesign: restored the interactive homepage version checker, the expanded dashboard release list and reasoning credit-estimate guidance.
- Supabase Google/email accounts, Stripe billing, purchased credit carryover and activity history remain integrated with the redesigned workspace.

Validation: all 67 automated tests, TypeScript, production Next.js build and Cloudflare build passed. Compared auth, billing, credit and migration code against the teammate branch; functional logic is preserved. No deployment or external sign-in/payment performed.

## v0.2.1 — 2026-10-22

- Combined the complete Redesign branch with v0.2.0 Supabase accounts, Stripe billing, purchased credits and account history.
- Connected redesigned workspace sign-in and account links to the real Google/email account flow and verified Supabase identity.
- Preserved the redesigned landing page, starfield, branding, pickers, chat commands, plugin/mod source previews and downloadable resource/shader packs.
- Kept server-enforced model restrictions, provider reasoning controls, usage accounting and credit reservations across generation and repairs.

Validation: all 67 automated tests and TypeScript checks passed; production Next.js and Cloudflare builds passed. Local production HTTP checks passed for the homepage, workspace, account, pricing and artifact catalog; cross-origin sign-in returned 403 and anonymous auth returned no user. No deployment, real payment or completed external Google sign-in performed for this merge.

## v0.2.0 — 2026-10-22

- Added email/password and Google accounts through Supabase, including confirmation, recovery and verified ownership of billing balances across devices.
- Enabled live Stripe billing and custom credit top-ups with a $10 minimum and plan-specific pricing. Signed payment events grant purchases exactly once.
- Separated renewing allowances from purchased credits. Purchased credits carry over; generation spends allowance first and safely refunds reservations.
- Added a billing summary and paginated credit activity on the account page, with renewal dates and scheduled downgrade status.
- Added one-click downgrade to Free: Stripe subscriptions retain access until period end; complimentary plans switch immediately. Purchased credits are preserved.
- Restricted testing to GPT-6 Luna and approved free-tier Gemini, with server-side enforcement. Free-tier Gemini requires its own key from a non-billing project and never falls back to a paid Gemini key.
- Added database migrations 0003–0005, account/provider setup notes, and a standing version/commit/push workflow for future changes.

Validation: 62 automated tests passed; production Cloudflare build and deployment passed. Live checks verified private-history authentication, blocked premium generation, origin checks and checkout creation. No real payment was made by the agent.

Deployment: Cloudflare Worker `6e98f3c8-c39e-4112-a537-a1f05d4236d8` contains these application features. This release adds the version and change records to that deployed application state.

Remaining setup: connect provider keys and build service, configure production email delivery, and complete authenticated UI/payment/provider acceptance tests. Optional Groq, OpenRouter and direct DeepSeek integrations are not connected yet.
