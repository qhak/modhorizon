import { BillingError } from "./billing-errors";

export type StripeConfig = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_STARTER?: string;
  STRIPE_PRICE_PRO?: string;
  STRIPE_PRICE_STUDIO?: string;
};

/** Infer the mode from server credentials; never expose the credential itself. */
export function stripeMode(secret: string | undefined): "test" | "live" | null {
  const match = /^(?:sk|rk)_(test|live)_[A-Za-z0-9]+$/.exec(secret || "");
  return match ? match[1] as "test" | "live" : null;
}

export function stripeReadiness(env: StripeConfig) {
  const mode = stripeMode(env.STRIPE_SECRET_KEY);
  const webhookConfigured = Boolean(env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_") && env.STRIPE_WEBHOOK_SECRET.length > 6);
  return {
    mode,
    checkoutConfigured: Boolean(mode && webhookConfigured && env.STRIPE_PRICE_STARTER && env.STRIPE_PRICE_PRO && env.STRIPE_PRICE_STUDIO),
    topupsConfigured: Boolean(mode && webhookConfigured),
  };
}

/** Call only after verifying the signature, before recording or applying an event. */
export function assertStripeEventMode(env: StripeConfig, event: { livemode?: unknown }) {
  const mode = stripeMode(env.STRIPE_SECRET_KEY);
  if (!mode) throw new BillingError("Stripe secret key is not configured.");
  if (typeof event.livemode !== "boolean" || event.livemode !== (mode === "live"))
    throw new BillingError("Stripe event mode does not match the configured billing mode.", 400);
}
