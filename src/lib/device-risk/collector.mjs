// Call only at the point your application has established an appropriate legal
// basis and explained the collection. No network calls are made by this module.
const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
function deviceId(storage) {
  return safe(() => {
    const key = 'device-risk-id-v1';
    let id = storage.getItem(key);
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) { id = crypto.randomUUID(); storage.setItem(key, id); }
    return id;
  });
}
async function canvasSignal() {
  return safe(async () => {
    const c = document.createElement('canvas'); c.width = 240; c.height = 60;
    const x = c.getContext('2d'); if (!x) return null;
    x.fillStyle = '#e7aa32'; x.fillRect(5, 7, 110, 31);
    x.font = '16px Arial'; x.fillStyle = '#25497c'; x.fillText('Device check 123', 11, 29);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = '#9b31a3'; x.beginPath(); x.arc(130, 25, 15, 0, 7); x.fill();
    return digest(c.toDataURL());
  });
}
function graphics() {
  return safe(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { renderer: null, parameters: null };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
    const parameters = { maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS), maxViewport: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)) };
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { renderer, parameters };
  }, { renderer: null, parameters: null });
}
async function audioSignal() {
  try {
    const C = window.OfflineAudioContext || window.webkitOfflineAudioContext; if (!C) return null;
    const context = new C(1, 4410, 44100); const oscillator = context.createOscillator(); const compressor = context.createDynamicsCompressor();
    oscillator.type = 'triangle'; oscillator.frequency.value = 10000; oscillator.connect(compressor); compressor.connect(context.destination); oscillator.start(0);
    const timeout = new Promise(resolve => setTimeout(() => resolve(null), 1200));
    const rendered = await Promise.race([context.startRendering(), timeout]); if (!rendered) return null;
    const samples = rendered.getChannelData(0); let sum = 0; for (let i = 1000; i < 1500; i++) sum += Math.abs(samples[i]);
    return digest(sum.toFixed(6));
  } catch { return null; }
}
function fontMeasurements() {
  return safe(() => {
    const c = document.createElement('canvas'); const ctx = c.getContext('2d'); if (!ctx) return null;
    const fonts = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New'];
    return Object.fromEntries(fonts.map(font => { ctx.font = `16px "${font}", sans-serif`; return [font, Math.round(ctx.measureText('mmmmWWWWiii123').width * 100) / 100]; }));
  });
}
function mediaCodecs() {
  return safe(() => {
    const v = document.createElement('video'); const a = document.createElement('audio');
    return { h264: v.canPlayType('video/mp4; codecs="avc1.42E01E"'), vp9: v.canPlayType('video/webm; codecs="vp9"'), opus: a.canPlayType('audio/ogg; codecs="opus"'), aac: a.canPlayType('audio/mp4; codecs="mp4a.40.2"') };
  });
}
export async function collectDeviceSignals({ useDeviceId = true } = {}) {
  if (typeof window === 'undefined' || !globalThis.crypto?.subtle) throw new Error('A secure browser context is required');
  const g = graphics();
  const hints = safe(() => navigator.userAgentData ? { brands: navigator.userAgentData.brands, mobile: navigator.userAgentData.mobile, platform: navigator.userAgentData.platform } : null);
  const [canvas, audio] = await Promise.all([canvasSignal(), audioSignal()]);
  return { version: 1, deviceId: useDeviceId ? deviceId(window.localStorage) : null, canvas, webglRenderer: g.renderer, webglParameters: g.parameters, userAgent: navigator.userAgent || null, platform: navigator.platform || null, clientHints: hints, screen: { width: screen.width, height: screen.height, pixelRatio: window.devicePixelRatio, colorDepth: screen.colorDepth }, timezone: safe(() => Intl.DateTimeFormat().resolvedOptions().timeZone), languages: Array.from(navigator.languages || []), audio, hardwareConcurrency: navigator.hardwareConcurrency ?? null, deviceMemory: navigator.deviceMemory ?? null, maxTouchPoints: navigator.maxTouchPoints ?? null, fonts: fontMeasurements(), mediaCodecs: mediaCodecs() };
}
