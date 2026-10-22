import { authConfiguration, verifiedAuthUser } from "@/lib/account-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ ...await authConfiguration(), user: await verifiedAuthUser() }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Account service is temporarily unavailable." }, { status:503, headers:{"Cache-Control":"no-store"} }); }
}
