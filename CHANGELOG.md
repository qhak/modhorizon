# Change notes

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
