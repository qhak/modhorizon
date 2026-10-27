import { accountFromRequest, BillingError, billingEnv } from "@/lib/billing-service";
import { hasAllowedOrigin } from "@/lib/request-origin";
import { beginRewardedAdClaim, cancelRewardedAdClaim, grantRewardedAdClaim, rewardedAdStatus, rewardedAdsConfigured } from "@/lib/rewarded-ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
  const status = error instanceof BillingError ? error.status : 503;
  return Response.json({ error: error instanceof Error ? error.message : "Rewarded ads are unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  try {
    const [{ account, db }, env] = await Promise.all([accountFromRequest(request), billingEnv()]);
    return Response.json({ ...await rewardedAdStatus(db, account.id), enabled: rewardedAdsConfigured(env), adUnitPath: rewardedAdsConfigured(env) ? env.GAM_REWARDED_AD_UNIT_PATH : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) return Response.json({ error: "A same-origin request is required." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Use application/json." }, { status: 415 });
  try {
    const raw = await request.text();
    if (raw.length > 1_000) throw new BillingError("Reward request is too large.", 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; } catch { throw new BillingError("Reward request must be valid JSON.", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new BillingError("Reward request must be an object.", 400);
    const [{ account, db }, env] = await Promise.all([accountFromRequest(request), billingEnv()]);
    if (!rewardedAdsConfigured(env)) throw new BillingError("Rewarded ads are not configured yet.", 503);
    if (!account.authenticated) throw new BillingError("Sign in with a confirmed account to earn ad credits.", 401);
    if (body.action === "start") {
      const claim = await beginRewardedAdClaim(db, account.id);
      return Response.json({ claimId: claim.id, expiresAt: claim.expiresAt }, { headers: { "Cache-Control": "no-store" } });
    }
    if (typeof body.claimId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.claimId)) throw new BillingError("A valid reward claim is required.", 400);
    if (body.action === "grant") return Response.json(await grantRewardedAdClaim(db, account.id, body.claimId), { headers: { "Cache-Control": "no-store" } });
    if (body.action === "cancel") return Response.json({ cancelled: await cancelRewardedAdClaim(db, account.id, body.claimId) }, { headers: { "Cache-Control": "no-store" } });
    throw new BillingError("Choose start, grant, or cancel.", 400);
  } catch (error) { return errorResponse(error); }
}
