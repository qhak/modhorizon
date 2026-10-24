# Change notes

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
