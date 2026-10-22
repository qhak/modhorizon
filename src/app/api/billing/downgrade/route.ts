import { accountFromRequest, BillingError } from "@/lib/billing-service";
import { hasAllowedOrigin } from "@/lib/request-origin";
import { stripeMode } from "@/lib/stripe-config";
import { downgradeComplimentaryAccount, scheduleStripeDowngrade } from "@/lib/plan-downgrade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!request.headers.get("origin") || !hasAllowedOrigin(request))
    return Response.json({ error: "A same-origin request is required." }, { status: 403, headers });
  try {
    const { account, db, env } = await accountFromRequest(request);
    if (!account.authenticated) throw new BillingError("Sign in to change your plan.", 401);
    if (account.plan === "free") return Response.json({ message: "You are already on Free." }, { headers });
    const row = await db.prepare("SELECT stripe_subscription_id FROM billing_accounts WHERE id=?")
      .bind(account.id).first<{ stripe_subscription_id: string | null }>();
    if (!row) throw new BillingError("Account not found.", 404);
    if (!row.stripe_subscription_id) {
      await downgradeComplimentaryAccount(db, account.id);
      return Response.json({ message: "You are now on Free. Your purchased credits are kept." }, { headers });
    }
    if (!stripeMode(env.STRIPE_SECRET_KEY)) throw new BillingError("Payments are not configured.");
    // The subscription ID comes only from the authenticated account, never request input.
    const state = await scheduleStripeDowngrade(env.STRIPE_SECRET_KEY!, row.stripe_subscription_id);
    await db.prepare(`UPDATE billing_accounts SET cancel_at_period_end=1,current_period_end=?,updated_at=?
      WHERE id=? AND stripe_subscription_id=?`).bind(state.periodEnd, Date.now(), account.id, row.stripe_subscription_id).run();
    return Response.json({ message: "Renewal canceled. You will switch to Free at the end of your billing period. Your purchased credits are kept." }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof BillingError ? error.message : "Could not change your plan. Refresh and try again." },
      { status: error instanceof BillingError ? error.status : 503, headers });
  }
}
