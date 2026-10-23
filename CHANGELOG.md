# Change notes

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
