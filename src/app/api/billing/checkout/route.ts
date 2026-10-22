import { accountFromRequest, BillingError, createStripeCheckout } from "@/lib/billing-service";
import { hasAllowedOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) return Response.json({ error: "A same-origin request is required." }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return Response.json({ error: "Use application/json." }, { status: 415 });
  try {
    const raw = await request.text();
    if (raw.length > 2_000) throw new BillingError("Checkout request is too large.", 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw) as Record<string, unknown>; }
    catch { throw new BillingError("Checkout request must be valid JSON.", 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new BillingError("Checkout request must be an object.", 400);
    const { env, account } = await accountFromRequest(request);
    const result = await createStripeCheckout(request, account, body, env);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof BillingError ? error.status : 502;
    return Response.json({ error: error instanceof Error ? error.message : "Checkout is unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
