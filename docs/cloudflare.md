# Cloudflare hosting

## Current integrated version — 21 October 2026

Deployed source commit `8aba389` with the latest frontend, billing foundation,
model reasoning controls, credit quote endpoint, and durable credit reservations.
Cloudflare Worker version: `98d4abb4-2eda-4936-8353-64e14c4a269c`.

- [Homepage](https://modhorizon.callout-ai.workers.dev/), [create workspace](https://modhorizon.callout-ai.workers.dev/create), and [pricing](https://modhorizon.callout-ai.workers.dev/pricing) return HTTP 200.
- Remote D1 migration `0002_generation_reservations.sql` was applied before deployment.
- Live billing session and account endpoints work; a new guest receives the configured 10-credit Free allowance with a Secure, HttpOnly cookie.
- `/api/status` advertises plugin and mod support. Provider keys and Stripe secrets are absent: AI generation and checkout remain disabled.
- Quote requests reject unavailable providers and cross-origin requests without spending credits. No paid AI calls or payments were made during verification.
- OpenNext build and deployment succeeded. The bundle contains no local SQLite files or private environment files.

See [Generation and credit backend](backend-generation.md) for current integration details and remaining launch work. Older preview history follows.

## Earlier dashboard preview — 21 October 2026

Deployed the Batch 1 homepage/video and Batch 2 interface to the existing Worker. Current version: `23583bda-3d0c-45cf-b8a8-1ee4b158f91c`.

- [Homepage](https://modhorizon.callout-ai.workers.dev/).
- [Public dashboard preview](https://modhorizon.callout-ai.workers.dev/preview), with project-library, creation-form, credits and settings preview routes. These are explicitly read-only: no local database, account data, or browser project history is read or uploaded. Create/save/session actions stay disabled. No fake projects or credit balances are seeded.
- The normal `/dashboard` continues to explain unavailable hosted accounts and links to the public preview. Local project features still work only through the local development dashboard.
- Validation: typecheck and all 17 tests pass; OpenNext build/deployment succeed; all eight public page routes return HTTP 200; local session/project APIs remain HTTP 503; generation remains unavailable; the actual 4,374,963-byte video and poster serve successfully; browser preview navigation and disabled creation confirmed with no console errors. Video currently serves a full HTTP 200 response to Range requests; partial HTTP 206 delivery is not claimed.
- Packaging explicitly excludes `.data/**/*` through Next output tracing. The initial local staging build copied SQLite into the server-function staging directory (not public assets); after adding the exclusion and rebuilding, no SQLite files remain anywhere in `.open-next`. The corrected build was deployed.
- Public preview uses the existing dashboard component with a separate preview flag, skips library/browser-history loading and never performs project/account mutations. No new cloud database or paid-plan upgrade was provisioned. Batch 3 was not started.

[Deployment screenshot](cloudflare-dashboard-preview.png). Source and deployment notes are also archived in Obsidian.

Live URL: [ModHorizon](https://modhorizon.callout-ai.workers.dev/). First deployed on 21 October 2026; Worker version `78279cc1-7ba0-44ae-b34b-7fb427b2a12b`. Verified HTTP 200 for the interface, unconfigured flags from `/api/status`, disabled generation in the browser, and no browser console errors.

The existing Next.js app is deployed directly to the configured Cloudflare account using the OpenNext adapter. It remains a Next.js app locally. Cloudflare Workers hosts the interface and HTTP API; the Java/Gradle sandbox is a separate service and is not provisioned by this deployment.

## Commands

From the `modhorizon` directory:

```powershell
npm ci
npx wrangler whoami
npm run deploy
```

`npm run deploy` builds Next.js, adapts it into `.open-next/worker.js` and static assets, then uploads to the `modhorizon` Worker declared in `wrangler.jsonc`. A first deployment uses the account's Workers subdomain. No custom domain or other existing Worker is changed.

Use `npm run preview:cloudflare` to build and test in the local Workers runtime. `.dev.vars.example` lists optional preview bindings. Production rejects the development mock even when running a local production build. OpenNext recommends WSL for Windows if native builds fail.

## First hosted version

The initial deployment intentionally has no AI or build-service credentials. `/api/status` returns public availability flags, and the interface displays **Hosting preview · AI not connected** with generation disabled. It remains possible to explore suggestions, settings, the quick-start guide, and this browser's project history. API generation requests fail clearly rather than pretending to generate or compile.

Only non-secret `AI_PROVIDER=openai-compatible` is configured in Wrangler. Credentials from unrelated projects are never reused. The initial deployment makes no AI calls, creates no build jobs, and provisions no database, R2 bucket, queue, or paid-plan upgrade.

## Enabling generation later

After adding authentication/quotas and a durable job/artifact design, configure server-only secrets with `npx wrangler secret put OPENAI_API_KEY`, `npx wrangler secret put ANTHROPIC_API_KEY`, `npx wrangler secret put GEMINI_API_KEY`, `npx wrangler secret put BUILD_SERVICE_URL`, and `npx wrangler secret put BUILD_SERVICE_TOKEN`, entering each value interactively. The model picker enables only providers with a configured credential. Optional `OPENAI_BASE_URL`, `ANTHROPIC_BASE_URL`, and `GEMINI_BASE_URL` select trusted HTTPS endpoints. Do not put values in command arguments, source files, or `NEXT_PUBLIC_` variables. Wrangler preserves secrets across deployments.

The external build service must implement the [isolated worker contract](backend.md). A Cloudflare Worker does not execute Java/Gradle builds. The current process-local concurrency guard and artifact memory map are suitable for local development, not durable multi-isolate hosting: requests and downloads may reach different isolates. Add R2-backed artifacts, durable jobs, ownership and abuse controls before enabling public generation. Compiling a plugin still requires the documented Paper server behavior tests.

Logs are enabled in the Worker configuration. Use `npx wrangler tail modhorizon` when diagnosing runtime problems; never log prompts, secrets, or full provider responses.

Primary references: [Cloudflare OpenNext deployment](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/) and [OpenNext runtime environment variables](https://opennext.js.org/cloudflare/howtos/env-vars).
