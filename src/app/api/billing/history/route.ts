import { accountFromRequest, BillingError } from "@/lib/billing-service";
import { creditHistory } from "@/lib/credit-history";
import { BILLING_PLANS } from "@/lib/billing-catalog";
import { subscriptionCancellationState } from "@/lib/plan-downgrade";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { account, db, env } = await accountFromRequest(request);
    if (!account.authenticated) throw new BillingError("Sign in to see your billing history.", 401);
    const history = await creditHistory(db, account.id, new URL(request.url).searchParams.get("cursor"));
    const row = await db.prepare("SELECT stripe_subscription_id,stripe_customer_id FROM billing_accounts WHERE id=?")
      .bind(account.id).first<{ stripe_subscription_id: string | null; stripe_customer_id: string | null }>();
    let periodEnd = account.currentPeriodEnd ?? null, scheduled = account.cancelAtPeriodEnd ?? false;
    let renewalUnavailable = false;
    if (row?.stripe_subscription_id && env.STRIPE_SECRET_KEY) {
      try {
        const res = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(row.stripe_subscription_id)}`, {
          redirect: "manual", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }, signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error();
        const state = subscriptionCancellationState(await res.json());
        periodEnd = state.periodEnd; scheduled = state.scheduled;
      } catch { renewalUnavailable = true; }
    }
    return Response.json({
      summary: { plan: account.plan, planName: BILLING_PLANS[account.plan].name, balance: account.credits,
        allowanceCredits: account.allowanceCredits, purchasedCredits: account.purchasedCredits, rewardedAdCredits: account.rewardedAdCredits,
        subscriptionStatus: account.subscriptionStatus, complimentary: account.plan !== "free" && !row?.stripe_subscription_id,
        hasBillingCustomer: Boolean(row?.stripe_customer_id), periodEnd, cancelAtPeriodEnd: scheduled, renewalUnavailable,
        priceCents: BILLING_PLANS[account.plan].priceCents }, ...history,
    }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof BillingError ? error.message : "Billing history is unavailable. Please try again." },
      { status: error instanceof BillingError ? error.status : 503, headers });
  }
}
