# Stripe test mode setup

The billing integration is test-mode only. The server rejects a Stripe secret that does not start with `sk_test_`. No payment is collected by this configuration, and credit top-ups are manual rather than automatic.

## 1. Create the test prices

In the Stripe Dashboard, switch to **Test mode**. Create three recurring monthly prices, then copy their `price_...` IDs:

| Plan | Monthly price | Included credits |
| --- | ---: | ---: |
| Starter | $14.99 | 350 |
| Pro | $49.99 | 1,500 |
| Studio | $99.99 | 4,000 |

The application uses the plan and credit amounts from `src/lib/billing-catalog.ts`; Stripe is only the payment processor. Do not create a Stripe price for the manual credit pack: checkout creates its one-time amount server-side from the subscriber's plan rate.

## 2. Configure local secrets

Create `.dev.vars` in the project root (it is gitignored) with the test values:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
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

## 3. Forward test webhooks locally

Run the app in the Cloudflare Workers runtime with `npm run preview:cloudflare`, then in another terminal run:

```powershell
stripe listen --forward-to http://127.0.0.1:8787/api/billing/webhook
```

Use the `whsec_...` value printed by Stripe CLI as the local `STRIPE_WEBHOOK_SECRET`. Open the exact preview URL printed by Wrangler if it chooses another port.

For the deployed Worker, create a Stripe **test-mode webhook endpoint** at:

```text
https://modhorizon.callout-ai.workers.dev/api/billing/webhook
```

Subscribe it to these events:

- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`

Copy that endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`. Webhook signatures are checked against the raw request body, and processed event IDs are recorded in D1 to make retries idempotent.

## 4. Apply D1 and test the flow

The Worker binds the separate `modhorizon-billing` D1 database as `BILLING_DB`. Apply its schema before deploying billing routes:

```powershell
npm run db:migrate:local
npm run db:migrate:remote
```

With Stripe test settings configured, test a new guest session, each subscription in test mode, a manual 100-credit top-up, renewal, failed payment, cancellation, and duplicate webhook delivery. Confirm every ledger entry and balance in D1. The app currently blocks creating a second paid subscription because plan changes and Stripe customer portal flows are not implemented yet.

## Account and launch limits

The current account is a random HttpOnly browser session. It has no verified email, sign-in, recovery, or cross-device sync. Clearing browser storage/cookies creates a new free account, so do not enable public free AI generation until identity, rate limits, and abuse controls are added. Do not switch to live Stripe keys; live mode is intentionally rejected.

Credits are estimated from the configured model token rates. The target margin is a rough gross estimate before Stripe fees, hosting, tax, and price changes. Review `src/lib/models.ts` before selling real credits.
