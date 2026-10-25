export type VerifiedAccountUser = { id: string; email: string };

export function resolveAccountAppOrigin(requestUrl: string, configuredOrigin?: string, localOrigin?: string, development = false, requestHost?: string | null): string {
  const url = new URL(requestUrl);
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  // The private preview launcher explicitly sets its origin. Cloudflare's dev
  // bindings may still contain the hosted APP_ORIGIN from .dev.vars.
  if (development && loopback && localOrigin) {
    const local = new URL(localOrigin);
    const localLoopback = local.hostname === "localhost" || local.hostname === "127.0.0.1";
    if (localLoopback && local.protocol === url.protocol && local.host === (requestHost ?? url.host)) return local.origin;
  }
  if (configuredOrigin) return new URL(configuredOrigin).origin;
  if (loopback) return url.origin;
  return "https://modhorizon.callout-ai.workers.dev";
}

export function confirmedAccountUser(user: { id: string; email?: string; email_confirmed_at?: string; is_anonymous?: boolean } | null): VerifiedAccountUser | null {
  if (!user || user.is_anonymous || !user.email || !user.email_confirmed_at) return null;
  return { id: user.id, email: user.email };
}

export function safeAccountReturn(value: string | null | undefined): string {
  // Keep redirects to the two product destinations; never accept arbitrary origins.
  return value === "/pricing" || value === "/" ? value : "/account";
}

export function validPassword(password: string): boolean {
  return password.length >= 12 && password.length <= 128;
}
