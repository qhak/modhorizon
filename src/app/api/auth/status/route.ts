import { authConfiguration, providerVerifiedAuthUser, accountDeletionPending } from "@/lib/account-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const user=await providerVerifiedAuthUser(), deletionPending=!!user && await accountDeletionPending(user.id); return Response.json({ ...await authConfiguration(), user:deletionPending?null:user,deletionPending }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Account service is temporarily unavailable." }, { status:503, headers:{"Cache-Control":"no-store"} }); }
}
