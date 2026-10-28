# Stripe setup

## Historical deployment snapshot — 22 October 2026

This section records an earlier deployment only. It is not proof of current
production state; use the release-readiness checklist to recheck the Worker,
D1, secrets and webhook configuration before changing production.

Pricing styling fix subsequently deployed as `3c404c63-38ac-4730-a3da-887bef3d34b1`: `/pricing` now imports `landing.css` directly. Previously only the homepage imported the file containing pricing rules, so fresh pricing loads and Stripe return navigation could render without the card layout. Production direct-load HTML now references the stylesheet containing `.pricing-grid`. Visually checked the live `/pricing?billing=cancel` page, styled grid, enabled paid-plan buttons, and no horizontal overflow. Screenshot: `outputs/modhorizon-pricing-fixed.png` in the parent workspace.

- Worker version: `84376269-4557-46fb-adb3-389b8157c71b` at `https://modhorizon.callout-ai.workers.dev`.
- All five Stripe settings are stored as Worker secrets. Local `.dev.vars` remains ignored; no secret values are documented here.
- Verified the existing remote D1 migrations are applied. Before deployment, all five existing accounts were free/inactive with no linked Stripe subscriptions.
- Starter, Pro, and Studio each created a live unpaid Checkout Session with the correct USD amount. Each session was expired after inspection; no payment or subscription was created.
- Signed nonfinancial webhook check accepted; duplicate detected; unsigned and mismatched test-mode events rejected. This checks the deployed handler, not an actual Stripe-to-Worker paid invoice delivery. Payment-to-credit fulfillment still requires a real payment or an isolated full test-mode flow.
- Live browser pricing shows the Free balance and enabled plan buttons with no console errors. Cross-origin checkout is rejected.
- Fixed a deployed Cloudflare incompatibility: outbound Stripe calls use manual redirects and reject 3xx responses, preventing credential forwarding. All 42 tests and the production Cloudflare build pass.
- Provider credentials and build service are still absent. Browser-cookie accounts have no recovery, and subscription self-service cancellation remains unimplemented. This deployment is not a completed customer launch.

The current source requires a confirmed account for Checkout, uses server-owned prices/credit quantities and verifies signed webhook events before fulfillment. Start with a separate Stripe test-mode account and isolated D1 database; test keys and `whsec_` values must never be mixed with live configuration. Live mode charges real money. Checkout stays disabled until a matching signing secret and price configuration are present.

## 1. Configure the prices

In the Stripe Dashboard, select **test mode** and create three USD recurring monthly prices for acceptance. Copy their test `price_...` IDs. Prices must belong to the same account and mode as the secret key. The table below lists previously supplied identifiers for reference only; their mode and amounts have not been independently rechecked. Do not use them for local tests unless you confirm they belong to the test account:

| Plan | Product ID | Price ID |
| --- | --- | --- |
| Starter | `prod_VUGg6CZtPOJrwT` | `price_1UTI9SIwWA16AntFjOWwzL13` |
| Pro | `prod_VUGhMicA0Kk82T` | `price_1UTIAKIwWA16AntFCY9DiFWW` |
| Studio | `prod_VUGiEtEluBjDqy` | `price_1UTIApIwWA16AntFkbHRxzhc` |

| Plan | Monthly price | Included credits |
| --- | ---: | ---: |
| Starter | $14.99 | 350 |
| Pro | $49.99 | 1,500 |
| Studio | $99.99 | 4,000 |

The application uses the plan and credit amounts from `src/lib/billing-catalog.ts`; Stripe is only the payment processor. Do not create a Stripe price for the manual credit pack: checkout creates its one-time amount server-side from the subscriber's plan rate.

### Promotion codes

Subscription and credit top-up Checkout enable Stripe's promotion-code field.
Create coupons and customer-facing promotion codes in the matching Stripe
account and mode, then verify eligibility, expiry, redemption limits and the
resulting invoice in a separate test-mode environment before advertising a
code. Top-up fulfillment checks the original subtotal, discount arithmetic,
currency and positive paid status before granting the server-quoted credits;
billing history records the discounted amount paid. A fully discounted top-up
does not grant credits. There is no in-app discount-code administration or
reporting screen.

## 2. Configure local secrets

Create `.dev.vars` in the project root (it is gitignored) with the test-mode values:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_STUDIO=price_...
```

Never commit `.dev.vars` or paste secret values into chat. The example file `.dev.vars.example` contains only variable names.

Only when intentionally configuring a production deployment, use Wrangler's interactive prompts so live secret values do not appear in shell history. Keep this separate from test setup:

```powershell
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
npx wrangler secret put STRIPE_PRICE_STARTER
npx wrangler secret put STRIPE_PRICE_PRO
npx wrangler secret put STRIPE_PRICE_STUDIO
```

The price IDs are identifiers rather than credentials, but storing them as Worker secrets keeps local and deployed configuration consistent.

## 3. Configure the matching webhook

For isolated test-mode checks, use a separate test configuration and database, run the app in the Cloudflare Workers runtime with `npm run preview:cloudflare`, then in another terminal run:

```powershell
stripe listen --forward-to http://127.0.0.1:8787/api/billing/webhook
```

Use the `whsec_...` value printed by Stripe CLI as the local `STRIPE_WEBHOOK_SECRET`. Open the exact preview URL printed by Wrangler if it chooses another port.

For a production deployment, create a Stripe **live-mode webhook endpoint** at the verified public origin:

```text
https://modhorizon.callout-ai.workers.dev/api/billing/webhook
```

Subscribe it to these events:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`
- `checkout.session.async_payment_succeeded`

Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. Webhook signatures are checked against the raw request body, events from a different mode are rejected before database mutations, and processed event IDs are recorded in D1 to make retries idempotent. Do not reuse a test database or populated test-account cookies with live credentials: use separate deployments/databases for live and test billing.

## 4. Apply D1 and test the flow

The Worker binds the separate `modhorizon-billing` D1 database as `BILLING_DB`. For local acceptance, apply the schema to the local D1 database:

```powershell
npm run db:migrate:local
```

Apply remote migrations only as an intentional release operation: first verify
the remote migration ledger, back up production D1, and follow the release
checklist. Migrations are ordered through `0010_social_rewards.sql`.

For a safe end-to-end check, use a separate Stripe test account/mode, test credentials, webhook secret, and isolated D1 database. Sign in with a confirmed test account, exercise subscription Checkout and renewal, apply a test promotion code, buy a top-up at the server-quoted subtotal, then verify signed webhook fulfillment, duplicate-event idempotency, and ledger/balance values. Also check failed payment, cancellation/downgrade, portal ownership and rejected mismatched amounts. A 100% promotion must not grant credits because the Checkout session is not paid. Automated tests use fake credentials and make no real payments; any live purchase charges real money.

Subscription Checkout blocks starting another paid plan for an already-paid account. The app provides the Stripe customer portal and period-end downgrade flow, but upgrades/plan switching are not available in this preview. Configure and test the portal in the same Stripe account and mode as the application.

## Account and launch limits

The current source uses managed Supabase Auth for confirmed email/password and optional Google sign-in; checkout and top-ups require a confirmed account. Complete SMTP delivery, bot/rate-limit configuration and cross-browser recovery acceptance before public signup. Subscription cancellation and billing management are implemented through the portal/downgrade flows, but must be verified in the matching production configuration. Account deletion remains disabled until disposable staging acceptance and recovery procedures pass.

Credits are estimated from the configured model token rates. The target margin is a rough gross estimate before Stripe fees, hosting, tax, and price changes. Review `src/lib/models.ts` before selling real credits.
