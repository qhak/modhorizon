import type { DeviceRiskEnv, VerifiedUser } from './device-risk-service';
import { isRiskOwner } from './device-risk-service';
const encoder = new TextEncoder();
const ttl = 5 * 60 * 1000;
function bytesHex(bytes: ArrayBuffer) { return Array.from(new Uint8Array(bytes), x=>x.toString(16).padStart(2,'0')).join(''); }
function base64url(value:string) { return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function unbase64url(value:string) { const normal=value.replace(/-/g,'+').replace(/_/g,'/'); return atob(normal+'='.repeat((4-normal.length%4)%4)); }
async function key(secret:string) { return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']); }
export async function createDeviceRiskToken(env:DeviceRiskEnv,user:VerifiedUser|null,now=Date.now()) {
  if (!isRiskOwner(env,user) || !user) return null;
  const payload=base64url(JSON.stringify({v:1,sub:user.id,email:user.email,exp:now+ttl}));
  const signature=bytesHex(await crypto.subtle.sign('HMAC',await key(env.DEVICE_RISK_HMAC_SECRET!),encoder.encode('device-risk-desktop-v1.'+payload)));
  return `${payload}.${signature}`;
}
export async function verifyDeviceRiskToken(env:DeviceRiskEnv,token:string,now=Date.now()):Promise<VerifiedUser|null> {
  if (typeof token!=='string' || token.length>2048 || !env.DEVICE_RISK_HMAC_SECRET || new TextEncoder().encode(env.DEVICE_RISK_HMAC_SECRET).length<32) return null;
  const parts=token.split('.'); if(parts.length!==2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[0-9a-f]{64}$/.test(parts[1])) return null;
  try {
    const signature=Uint8Array.from(parts[1].match(/../g)!,x=>parseInt(x,16));
    if (!await crypto.subtle.verify('HMAC',await key(env.DEVICE_RISK_HMAC_SECRET),signature,encoder.encode('device-risk-desktop-v1.'+parts[0]))) return null;
    const data=JSON.parse(unbase64url(parts[0]));
    if(data.v!==1 || typeof data.sub!=='string' || typeof data.email!=='string' || !Number.isSafeInteger(data.exp) || data.exp<=now || data.exp>now+ttl) return null;
    const user={id:data.sub,email:data.email}; return isRiskOwner(env,user)?user:null;
  } catch { return null; }
}
