import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifiedAuthUser } from '@/lib/account-auth';
import { hasAllowedOrigin } from '@/lib/request-origin';
import { createDeviceRiskToken } from '@/lib/device-risk-token';
import type { DeviceRiskEnv } from '@/lib/device-risk-service';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
  if(!request.headers.get('origin')||!hasAllowedOrigin(request)) return Response.json({error:'Forbidden'},{status:403,headers});
  try { const env=(await getCloudflareContext({async:true})).env as unknown as DeviceRiskEnv; const token=await createDeviceRiskToken(env,await verifiedAuthUser());
    if(!token)return Response.json({error:'Not found'},{status:404,headers});
    return Response.json({token,expiresIn:300},{headers});
  } catch {return Response.json({error:'Unavailable'},{status:503,headers});}
}
