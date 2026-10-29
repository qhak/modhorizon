// Reject unexpected or malformed browser data before it reaches storage or HMAC.
const str = (v,n=256) => typeof v === 'string' && v.length > 0 && v.length <= n;
const nullable = (v,fn) => v === null || v === undefined || fn(v);
const number = (v,min,max) => typeof v === 'number' && Number.isFinite(v) && v>=min && v<=max;
const object = v => v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;
const keysOnly = (v, keys) => Object.keys(v).every(key=>keys.includes(key));
const hash = v => typeof v==='string' && /^[a-f0-9]{64}$/.test(v);
export function validateSignals(s) {
  if (!object(s) || s.version !== 1 || !keysOnly(s,['version','deviceId','canvas','webglRenderer','webglParameters','userAgent','platform','clientHints','screen','timezone','languages','audio','hardwareConcurrency','deviceMemory','maxTouchPoints','fonts','mediaCodecs'])) return false;
  if (!nullable(s.deviceId,v=>str(v,64)) || !nullable(s.canvas,hash) || !nullable(s.audio,hash) || !nullable(s.webglRenderer,v=>str(v,512)) || !nullable(s.userAgent,v=>str(v,1024)) || !nullable(s.platform,v=>typeof v==='string'&&v.length<=256) || !nullable(s.timezone,v=>str(v,128))) return false;
  if (!nullable(s.languages,v=>Array.isArray(v)&&v.length<=16&&v.every(x=>str(x,64)))) return false;
  if (!nullable(s.hardwareConcurrency,v=>number(v,0,1024)) || !nullable(s.deviceMemory,v=>number(v,0,1024)) || !nullable(s.maxTouchPoints,v=>number(v,0,1024))) return false;
  if (!nullable(s.screen,v=>object(v)&&keysOnly(v,['width','height','pixelRatio','colorDepth'])&&number(v.width,0,100000)&&number(v.height,0,100000)&&number(v.pixelRatio,0,100)&&number(v.colorDepth,0,256))) return false;
  if (!nullable(s.webglParameters,v=>object(v)&&keysOnly(v,['maxTextureSize','maxRenderbufferSize','maxVertexAttribs','maxViewport'])&&number(v.maxTextureSize,0,1000000)&&number(v.maxRenderbufferSize,0,1000000)&&number(v.maxVertexAttribs,0,1000000)&&Array.isArray(v.maxViewport)&&v.maxViewport.length===2&&v.maxViewport.every(x=>number(x,0,1000000)))) return false;
  if (!nullable(s.fonts,v=>object(v)&&Object.keys(v).length<=12&&Object.entries(v).every(([k,x])=>str(k,64)&&number(x,0,100000)))) return false;
  if (!nullable(s.mediaCodecs,v=>object(v)&&keysOnly(v,['h264','vp9','opus','aac'])&&Object.values(v).every(x=>typeof x==='string'&&['','maybe','probably'].includes(x)))) return false;
  if (!nullable(s.clientHints,v=>object(v)&&keysOnly(v,['brands','mobile','platform'])&&typeof v.mobile==='boolean'&&typeof v.platform==='string'&&v.platform.length<=128&&Array.isArray(v.brands)&&v.brands.length<=10&&v.brands.every(b=>object(b)&&keysOnly(b,['brand','version'])&&str(b.brand,128)&&str(b.version,128)))) return false;
  return true;
}
