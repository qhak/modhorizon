// Cloudflare Workers-compatible alternative to matcher.mjs. No network or
// database access: callers must validate, authorize and limit requests first.
export const SIGNALS = ['deviceId','canvas','webglRenderer','webglParameters','userAgent','platform','clientHints','screen','timezone','languages','audio','hardwareConcurrency','deviceMemory','maxTouchPoints','fonts','mediaCodecs'];
const weights = {deviceId:45,canvas:20,webglRenderer:5,webglParameters:5,userAgent:5,platform:2,clientHints:2,screen:4,timezone:1,languages:2,audio:8,hardwareConcurrency:1,deviceMemory:1,maxTouchPoints:1,fonts:6,mediaCodecs:2};
const canonical = value => Array.isArray(value) ? `[${value.map(canonical).join(',')}]` : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',')}}` : JSON.stringify(value);
export async function protectSignals(signals, secret) {
  if (typeof secret !== 'string' || new TextEncoder().encode(secret).length < 32) throw Error('Use a server-side secret of at least 32 bytes');
  if (!signals || signals.version !== 1) throw TypeError('Unsupported signal format');
  const encoder = new TextEncoder(), key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const result = {};
  for (const name of SIGNALS) {
    const value = signals[name];
    if (value === null || value === undefined || (Array.isArray(value) && !value.length)) continue;
    const encoded = canonical(value); if (encoded.length > 4096) throw Error('Signal exceeds size limit');
    const hash = await crypto.subtle.sign('HMAC',key,encoder.encode(name+'\0'+encoded));
    result[name] = Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  }
  return {version:1,signals:result};
}
export function compareSignals(current,prior) {
  if (current?.version !== 1 || prior?.version !== 1) throw TypeError('Unsupported protected signals');
  let score=0; const matches=[];
  for (const [name,weight] of Object.entries(weights)) {
    const a=current.signals?.[name],b=prior.signals?.[name];
    if (typeof a==='string' && typeof b==='string' && /^[a-f0-9]{64}$/.test(a) && a===b) { score+=weight; matches.push(name); }
  }
  score=Math.min(100,score);
  return {score,level:score>=70?'high':score>=35?'medium':'low',matches,action:score>=35?'review':'allow'};
}
