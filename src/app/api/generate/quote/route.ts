import { limitedJson } from "@/lib/ai-provider";
import { accountFromRequest, BillingError } from "@/lib/billing-service";
import { quoteGeneration } from "@/lib/generation-quote";
import { hasAllowedOrigin } from "@/lib/request-origin";
import { serviceStatus } from "@/lib/service-status";
import { InputError, MAX_REQUEST_BYTES, validateRequest } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!hasAllowedOrigin(request))
    return Response.json({ error: "A same-origin request is required." }, { status: 403, headers });
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "Use application/json." }, { status: 415, headers });
  try {
    if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES)
      throw new BillingError("Request exceeds 200 KB.", 413);
    let body: unknown;
    try { body = await limitedJson(new Response(request.body), MAX_REQUEST_BYTES); }
    catch { throw new InputError("Request must contain valid JSON within the 200 KB limit."); }
    const input = validateRequest(body);
    const { account } = await accountFromRequest(request);
    if (!serviceStatus().choices[input.modelId || ""])
      throw new BillingError("That model is unavailable. Connect its provider first.");
    return Response.json({ quote: quoteGeneration(account, input) }, { headers });
  } catch (error) {
    const status = error instanceof BillingError ? error.status : error instanceof InputError ? 400 : 503;
    return Response.json({ error: error instanceof Error ? error.message : "Credit estimates are unavailable." }, { status, headers });
  }
}
