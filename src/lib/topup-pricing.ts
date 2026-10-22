import { BILLING_PLANS, type PaidPlanId } from "./billing-catalog";
import { BillingError } from "./billing-errors";
export const MIN_TOPUP_CENTS = 1000;
export const MAX_TOPUP_CREDITS = 100000;
export function topupAmountCents(plan: PaidPlanId, credits: number) {
  // USD cents are rounded up once on the whole purchase (Studio is 2.5 cents/credit).
  return Math.ceil(BILLING_PLANS[plan].extraCreditMilliUsd * credits / 10);
}
export function minimumTopupCredits(plan: PaidPlanId) {
  return Math.ceil(MIN_TOPUP_CENTS * 10 / BILLING_PLANS[plan].extraCreditMilliUsd);
}
export function defaultTopupCredits(plan: PaidPlanId) {
  return { starter: 150, pro: 250, studio: 400 }[plan];
}
export function validateTopup(plan: PaidPlanId, credits: unknown) {
  if (typeof credits !== "number" || !Number.isSafeInteger(credits) || credits <= 0 || credits > MAX_TOPUP_CREDITS)
    throw new BillingError(`Choose a whole number of credits up to ${MAX_TOPUP_CREDITS.toLocaleString("en-US")}.`, 400);
  const amountCents = topupAmountCents(plan, credits);
  if (amountCents < MIN_TOPUP_CENTS)
    throw new BillingError(`Minimum top-up is $10 (${minimumTopupCredits(plan)} credits on ${BILLING_PLANS[plan].name}).`, 400);
  return { credits, amountCents };
}
