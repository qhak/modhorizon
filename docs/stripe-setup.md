# Stripe setup

## Live deployment — 22 October 2026

Pricing styling fix subsequently deployed as `3c404c63-38ac-4730-a3da-887bef3d34b1`: `/pricing` now imports `landing.css` directly. Previously only the homepage imported the file containing pricing rules, so fresh pricing loads and Stripe return navigation could render without the card layout. Production direct-load HTML now references the stylesheet containing `.pricing-grid`. Visually checked the live `/pricing?billing=cancel` page, styled grid, enabled paid-plan buttons, and no horizontal overflow. Screenshot: `outputs/modhorizon-pricing-fixed.png` in the parent workspace.

- Worker version: `84376269-4557-46fb-adb3-389b8157c71b` at `https://modhorizon.callout-ai.workers.dev`.
- All five Stripe settings are stored as Worker secrets. Local `.dev.vars` remains ignored; no secret values are documented here.
- Verified the existing remote D1 migrations are applied. Before deployment, all five existing accounts were free/inactive with no linked Stripe subscriptions.
- Starter, Pro, and Studio each created a live unpaid Checkout Session with the correct USD amount. Each session was expired after inspection; no payment or subscription was created.
- Signed nonfinancial webhook check accepted; duplicate detected; unsigned and mismatched test-mode events rejected. This checks the deployed handler, not an actual Stripe-to-Worker paid invoice delivery. Payment-to-credit fulfillment still requires a real payment or an isolated full test-mode flow.
- Live browser pricing shows the Free balance and enabled plan buttons with no console errors. Cross-origin checkout is rejected.
- Fixed a deployed Cloudflare incompatibility: outbound Stripe calls use manual redirects and reject 3xx responses, preventing credential forwarding. All 42 tests and the production Cloudflare build pass.
- Provider credentials and build service are still absent. Browser-cookie accounts have no recovery, and subscription self-service cancellation remains unimplemented. This deployment is not a completed customer launch.

The billing integration supports live and test Stripe secret keys (`sk_live_` / `sk_test_`) and restricted server keys (`rk_live_` / `rk_test_`) with sufficient Checkout permissions. Live mode charges real money. The mode is inferred from the server key; webhook events must match it. Credit top-ups remain manual. Checkout stays disabled until the signing secret and price configuration are present.

## 1. Configure the prices

In the Stripe Dashboard, use the **live account** for the owner's requested live integration. Create three USD recurring monthly prices, then copy their `price_...` IDs. Prices must belong to the same account and mode as the secret key. The owner supplied these existing IDs; their mode and amounts still need verification in Stripe:

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

Subscription Checkout enables Stripe's promotion-code field. Create coupons and
customer-facing promotion codes in the matching Stripe account and mode, then
verify eligibility, expiry, redemption limits and the resulting invoice in a
separate test-mode environment before advertising a code. Credit top-up Checkout
does not accept promotion codes; the server validates the full expected amount
before granting credits. There is no in-app discount-code administration or
reporting screen.

## 2. Configure local secrets

Create `.dev.vars` in the project root (it is gitignored) with the live values:

```dotenv
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_STUDIO=price_...
```

Never commit `.dev.vars` or paste secret values into chat. The example file `.dev.vars.example` contains only variable names.

For a deployed Worker, use Wrangler's interactive prompts so secret values do not appear in shell history:

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

For the deployed Worker, create a Stripe **live-mode webhook endpoint** at:

```text
https://modhorizon.callout-ai.workers.dev/api/billing/webhook
```

Subscribe it to these events:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`

Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. Webhook signatures are checked against the raw request body, events from a different mode are rejected before database mutations, and processed event IDs are recorded in D1 to make retries idempotent. Do not reuse a test database or populated test-account cookies with live credentials: use separate deployments/databases for live and test billing.

## 4. Apply D1 and test the flow

The Worker binds the separate `modhorizon-billing` D1 database as `BILLING_DB`. Apply its schema before deploying billing routes:

```powershell
npm run db:migrate:local
npm run db:migrate:remote
```

Verify a new guest session, subscriptions, manual 100-credit top-ups, renewal, failed payment, cancellation, and duplicate webhook delivery. Isolated automated checks use fake credentials and make no real payments. Any live purchase charges real money. Confirm every ledger entry and balance in D1. The app currently blocks creating a second paid subscription because plan changes and Stripe customer portal flows are not implemented yet.

## Account and launch limits

The current account is a random HttpOnly browser session. It has no verified email, sign-in, recovery, or cross-device sync. Clearing browser storage/cookies creates a new free account and loses access to paid entitlements in that browser. Identity, account recovery, subscription cancellation, rate limits, and abuse controls remain unresolved launch work; accepting live keys does not implement these features.

Credits are estimated from the configured model token rates. The target margin is a rough gross estimate before Stripe fees, hosting, tax, and price changes. Review `src/lib/models.ts` before selling real credits.
