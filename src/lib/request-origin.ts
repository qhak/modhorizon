/**
 * Next may normalize request.url to localhost while preserving the real Host.
 * Use that Host for browser origin checks, and the URL for the scheme. Deliberately
 * do not trust X-Forwarded-* headers: a production proxy must preserve Host and
 * configure Next with the external HTTPS scheme, rejecting unknown public hosts.
 * An absent Origin is permitted for non-browser clients; this is not authentication.
 */
export function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    const source = new URL(origin);
    if (
      source.origin !== origin ||
      !["http:", "https:"].includes(source.protocol)
    )
      return false;
    const target = new URL(request.url);
    const host = request.headers.get("host") ?? target.host;
    if (!/^(?:\[[0-9a-f:]+\]|[a-z0-9.-]+)(?::\d{1,5})?$/i.test(host))
      return false;
    const expected = new URL(`${target.protocol}//${host}`);
    return (
      source.protocol === target.protocol && source.origin === expected.origin
    );
  } catch {
    return false;
  }
}
