# Change notes

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
