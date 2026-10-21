# Cloudflare hosting

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
