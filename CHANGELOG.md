# Change notes

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
