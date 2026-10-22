# Accounts and credit top-ups

Implementation scope agreed 22 October 2026:

- Email/password registration, email confirmation, sign-in, password recovery and Google sign-in through managed Supabase Auth.
- Keep Stripe billing and the credit ledger in Cloudflare D1. A verified auth subject owns one billing account; email addresses and browser-supplied account IDs cannot select an account.
- A guest may attach their current account to a new verified identity, preserving balances. Signing into an existing identity restores its existing account across devices without merging unrelated guest balances.
- Require verified sign-in before starting a subscription or buying top-ups. Existing anonymous billing sessions remain for exploration.
- Extra credits cost Starter $0.07, Pro $0.04, Studio $0.025 each. Server validates integer quantity and a minimum subtotal of $10. Defaults: 150/250/400 credits respectively. No automatic balance replenishment.
- Derive plan and rates on the server, create one-time Stripe Checkout dynamically, and grant credits only after a valid signed paid event with matching currency and amount. Duplicate deliveries must not grant twice.
- Monthly/free allowance and purchased credits are separate. Spend allowance first. Monthly allowance resets at renewal; purchased credits survive renewals, cancellation, and free allowance resets.
- Reservations remember the source balances and allowance period so refunds cannot revive expired monthly credits.
- Annual billing and rewarded ads are outside this implementation.

Validation: price boundary and input tampering tests; SQLite transaction, renewal and hold/refund tests; verified-identity ownership and account-switch tests; auth redirect validation; production build; browser checks of account and pricing screens. Live payment completion remains a user action.

External configuration: a dedicated ModHorizon Supabase project, email delivery suitable for real users, allowed app callback/recovery URLs, and a Google OAuth client connected to Supabase. Never store OAuth secrets or user passwords in source or these docs.

## Verification and rollout status

Dedicated Supabase project `mvtetzwggpslczowcfiq` (ModHorizon, London) is configured in local and production runtime values. Google is enabled in Supabase and the application; the owner added the normal and recovery callback URLs. Custom SMTP remains outstanding.

All 53 tests and the production Cloudflare build pass. Remote D1 migrations 0003 and 0004 were applied after an export backup. The Stripe webhook now includes asynchronous Checkout success. Live customer portal configuration enables invoice history, payment method updates, and cancellation at period end; its optional ID is supplied through STRIPE_PORTAL_CONFIGURATION_ID.

Deployed Worker version: `6ba32c7f-8dd5-40fa-bca0-31f5213a354d` at https://modhorizon.callout-ai.workers.dev. Live smoke checks passed for account/pricing/create pages, auth configuration, guest purchase denial and Google PKCE authorization redirect. The owner reached Google's account chooser. Completed Google login, public email delivery, payment completion and purchased-credit fulfillment still require end-to-end acceptance. No owner account was created by the agent, no email sent, and no charge made.

## One-click downgrade — 22 October 2026
Pricing's Free card offers authenticated paid accounts a Downgrade to Free button. Stripe-backed subscriptions cancel renewal at period end, retaining access and monthly allowance until Stripe's deletion event switches the account to Free. Scheduled state and billing period end are persisted through migration 0005 and subscription-update webhooks. Complimentary accounts switch immediately with an audited allowance replacement. Purchased balances survive both paths. The endpoint requires a verified account and explicit same-origin POST, and derives the subscription ID from its account record.
Tests cover complimentary allowance replacement, purchased-credit retention, duplicate attempts, account isolation, Stripe-backed/anonymous rejection, Stripe request semantics and failures. No real subscription was canceled during implementation.

Deployment: version 3c2ef02b-1bdb-4b69-ae83-971bc3e88697. Migration 0005 applied remotely. All 58 tests and production build passed. Live downgrade endpoint rejects missing/foreign Origin (403) and signed-out calls (401). Browser confirmed pricing policy text; authenticated downgrade button still needs owner acceptance in their signed-in browser.

## Billing overview, credit activity, and testing model lock — 22 October 2026
Account screen now loads an authenticated private billing overview: plan, balance buckets, complimentary/recurring status, verified Stripe period end and scheduled cancellation, plus paginated credit ledger entries. History queries are account-scoped and use validated keyset cursors; raw Stripe identifiers and unrelated account data are not returned. Failed renewal lookups are identified instead of presenting a cached date as confirmed.
AI_TESTING_MODE defaults to enabled unless explicitly false on the server. The allowlist is GPT-6 Luna, Gemini 3 Flash Preview (free-tier project key required), and local demo (development only). Provider choice, direct provider factory and credit reservation paths enforce the restriction; the model selector hides the blocked choices. Free Gemini requires GEMINI_FREE_API_KEY from a project without billing, and never falls back to the paid GEMINI_API_KEY. Provider quotas still apply; free-tier availability is not unlimited. Existing app credits remain charged for Gemini usage. Other free-provider adapters remain future integration work.
Provider keys: now OPENAI_API_KEY and GEMINI_FREE_API_KEY. Future options: ANTHROPIC_API_KEY, paid GEMINI_API_KEY, OpenRouter, Groq, and optional direct DeepSeek. No provider secret was collected or generation charged during implementation.

Deployed version 6e98f3c8-c39e-4112-a537-a1f05d4236d8. All 62 tests and production build passed. Live status confirms testingRestricted=true; history rejects signed-out access (401, private/no-store), and direct Astra generation is rejected before a provider call. No AI provider keys are connected yet. Authenticated account UI and real provider generation remain owner acceptance steps.
