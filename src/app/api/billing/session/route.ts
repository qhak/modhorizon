import { NextResponse } from "next/server";
import { BILLING_SESSION_COOKIE, openBillingSession, publicBillingConfig, revokeBillingSession } from "@/lib/billing-service";
import { hasAllowedOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request)) return Response.json({ error: "A same-origin request is required." }, { status: 403 });
  try {
    const { token, account, env } = await openBillingSession(request);
    const response = NextResponse.json({ account, checkoutConfigured: publicBillingConfig(env).checkoutConfigured }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(BILLING_SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 30 * 86400, secure: new URL(request.url).protocol === "https:" });
    return response;
  } catch (error) {
    const status = error && typeof error === "object" && "status" in error ? Number(error.status) : 503;
    return Response.json({ error: error instanceof Error ? error.message : "Billing session unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: Request) {
  if (!hasAllowedOrigin(request)) return Response.json({ error: "A same-origin request is required." }, { status: 403 });
  try {
    await revokeBillingSession(request);
    const response = NextResponse.json({ signedOut: true });
    response.cookies.set(BILLING_SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0, secure: new URL(request.url).protocol === "https:" });
    return response;
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not end the session." }, { status: 503 });
  }
}
