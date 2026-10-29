import { authConfiguration, authEnvironment, providerVerifiedAuthUser, accountDeletionPending } from "@/lib/account-auth";
import { deviceRiskConfigured, type DeviceRiskEnv } from '@/lib/device-risk-service';
export const dynamic = "force-dynamic";
export async function GET() {
  try { const user=await providerVerifiedAuthUser(), deletionPending=!!user && await accountDeletionPending(user.id); const riskEnv=await authEnvironment() as DeviceRiskEnv; return Response.json({ ...await authConfiguration(), user:deletionPending?null:user,deletionPending,deviceRiskEnabled:deviceRiskConfigured(riskEnv) }, { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return Response.json({ error: "Account service is temporarily unavailable." }, { status:503, headers:{"Cache-Control":"no-store"} }); }
}
