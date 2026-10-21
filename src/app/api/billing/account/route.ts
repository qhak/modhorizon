import { BILLING_PLANS } from "@/lib/billing-catalog";
import { billingEnv, publicBillingConfig, sessionForRequest } from "@/lib/billing-service";
import { MODEL_OPTIONS, estimateCreditsForModel } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const env = await billingEnv();
    const account = await sessionForRequest(request);
    return Response.json({
      account,
      billing: publicBillingConfig(env),
      models: MODEL_OPTIONS.map((model) => ({ id: model.id, label: model.label, group: model.group, credits: estimateCreditsForModel(model.id) })),
      plans: BILLING_PLANS,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 503;
    return Response.json({ error: error instanceof Error ? error.message : "Billing is unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
