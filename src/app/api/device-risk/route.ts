import { getCloudflareContext } from '@opennextjs/cloudflare';
import { verifiedAuthUser } from '@/lib/account-auth';
import { hasAllowedOrigin } from '@/lib/request-origin';
import { listRiskObservations, recordDevice, type DeviceRiskEnv } from '@/lib/device-risk-service';
import { verifyDeviceRiskToken } from '@/lib/device-risk-token';
export const dynamic = 'force-dynamic';
const response = (body: unknown, status=200) => Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
async function env() { return (await getCloudflareContext({async:true})).env as unknown as DeviceRiskEnv; }
async function readBounded(request:Request) {
  if (!request.body) return '';
  const reader=request.body.getReader(), chunks:Uint8Array[]=[]; let size=0;
  try {
    while(true) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>16000) {await reader.cancel(); throw new Error('too large');} chunks.push(value); }
    const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  } finally {reader.releaseLock();}
}
export async function GET(request:Request) {
  try {
    const config=await env(), authorization=request.headers.get('authorization');
    const user=authorization?.startsWith('Bearer ') ? await verifyDeviceRiskToken(config,authorization.slice(7)) : await verifiedAuthUser();
    const result = await listRiskObservations(config,user);
    if (result === null) return response({error:'Not found'},404);
    return response({items:result});
  } catch { return response({error:'Device review is unavailable.'},503); }
}
export async function POST(request: Request) {
  if (!request.headers.get('origin') || !hasAllowedOrigin(request)) return response({error:'A same-origin request is required.'},403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return response({error:'A JSON request is required.'},415);
  if (Number(request.headers.get('content-length')) > 16000) return response({error:'Request too large.'},413);
  try {
    const user=await verifiedAuthUser(); if (!user) return response({error:'Sign in required.'},401);
    let text:string; try {text=await readBounded(request);} catch {return response({error:'Invalid or oversized request.'},413);}
    let signals:unknown; try { signals=JSON.parse(text); } catch {return response({error:'Invalid request.'},400);}
    const result=await recordDevice(await env(),user,signals);
    return response(result);
  } catch { return response({error:'Device review is unavailable.'},503); }
}
