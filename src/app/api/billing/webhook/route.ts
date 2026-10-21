import { BillingError, processStripeWebhook } from "@/lib/billing-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const result = await processStripeWebhook(request);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof BillingError ? error.status : 500;
    return Response.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status });
  }
}
