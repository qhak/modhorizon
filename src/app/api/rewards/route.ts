import { accountFromRequest, BillingError } from "@/lib/billing-service";
import { limitedJson } from "@/lib/ai-provider";
import { validateCommunityImage } from "@/lib/community-media";
import { hasAllowedOrigin } from "@/lib/request-origin";
import { assertSocialRewardCanSubmit, configuredSocialRewardCampaigns, expireSocialRewardCredits, recordSocialRewardReview, reviewSocialRewardScreenshot, socialRewardClaimState } from "@/lib/social-rewards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function responseError(error: unknown) {
  const status = error instanceof BillingError ? error.status : 503;
  return Response.json({ error: error instanceof Error ? error.message : "Rewards are unavailable. Please try again." }, { status, headers });
}

export async function GET(request: Request) {
  try {
    const { account, db, env } = await accountFromRequest(request);
    if (!account.authenticated) throw new BillingError("Sign in with a confirmed account to view rewards.", 401);
    await expireSocialRewardCredits(db, account.id);
    const enabled = env.SOCIAL_REWARDS_ENABLED === "true";
    const campaigns = enabled ? configuredSocialRewardCampaigns(env.SOCIAL_REWARD_CAMPAIGNS_JSON) : [];
    return Response.json({ enabled, plan: account.plan, campaigns, claims: await socialRewardClaimState(db, account.id), socialRewardCredits: account.socialRewardCredits ?? 0 }, { headers });
  } catch (error) { return responseError(error); }
}

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) return Response.json({ error: "A same-origin request is required." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Use application/json." }, { status: 415, headers });
  try {
    const { account, db, env } = await accountFromRequest(request);
    if (!account.authenticated) throw new BillingError("Sign in with a confirmed account to earn rewards.", 401);
    if (account.plan !== "free") throw new BillingError("Social follow rewards are available to Free accounts.", 403);
    if (env.SOCIAL_REWARDS_ENABLED !== "true") throw new BillingError("Social rewards are not available yet.", 503);
    const raw = await limitedJson(new Response(request.body), 1_100_000);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new BillingError("Submit a valid reward request.", 400);
    const body = raw as Record<string, unknown>;
    if (typeof body.campaignId !== "string" || !/^[a-z0-9][a-z0-9_-]{0,49}$/.test(body.campaignId)) throw new BillingError("Choose a valid social reward.", 400);
    const campaign = configuredSocialRewardCampaigns(env.SOCIAL_REWARD_CAMPAIGNS_JSON).find(item => item.id === body.campaignId);
    if (!campaign) throw new BillingError("This social reward is not available.", 404);
    let image: ReturnType<typeof validateCommunityImage>;
    try { image = validateCommunityImage(body.dataUrl); }
    catch (error) { throw new BillingError(error instanceof Error ? error.message : "Upload a valid PNG or JPEG screenshot.", 400); }
    await assertSocialRewardCanSubmit(db, account.id, campaign.id);
    const verdict = await reviewSocialRewardScreenshot(`data:${image.contentType};base64,${image.bytes.toString("base64")}`, campaign, env);
    const claim = await recordSocialRewardReview(db, account.id, campaign, verdict);
    return Response.json({ ...claim, note: verdict.approved ? `Screenshot accepted. ${campaign.credits} credit${campaign.credits === 1 ? "" : "s"} added; it expires in 7 days.` : "We couldn't confirm the account and Following state in that screenshot. No credit was added." }, { headers });
  } catch (error) { return responseError(error); }
}
