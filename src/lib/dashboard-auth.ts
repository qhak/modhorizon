import { hasAllowedOrigin } from "./request-origin";
import { dashboardDatabase, LibraryError } from "./dashboard-db";
import { limitedJson } from "./ai-provider";
import { InputError } from "./validation";

export const SESSION_COOKIE = "modhorizon_local_session";
export function localDashboardEnabled(host: string | null, mode: string | undefined = process.env.NODE_ENV) {
  return mode === "development" && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host ?? "");
}
export function sessionCookie(request: Request) {
  return request.headers.get("cookie")?.split(";").map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
}
export function requireLocalRequest(request: Request) {
  if (!localDashboardEnabled(request.headers.get("host"))) throw new LibraryError("Dashboard storage requires the local development server. Hosted account authentication is not configured.", 503);
  // Mutations require an actual browser Origin; a missing Origin is not accepted.
  if (request.method !== "GET" && (!request.headers.get("origin") || !hasAllowedOrigin(request))) throw new LibraryError("A same-origin request is required.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new LibraryError("Cross-site dashboard requests are not allowed.", 403);
}
export async function authenticatedLibrary(request: Request) {
  requireLocalRequest(request);
  const token = sessionCookie(request);
  if (!token || !/^[\w-]{43}$/.test(token)) throw new LibraryError("Open a local dashboard session to continue.", 401);
  const db = await dashboardDatabase();
  const ownerId = db.session(token);
  if (!ownerId) throw new LibraryError("Open a local dashboard session to continue.", 401);
  return { db, ownerId };
}
export async function libraryBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new LibraryError("Use application/json.", 415);
  try { return await limitedJson(new Response(request.body), 200_000); }
  catch { throw new InputError("Request must contain valid JSON within 200 KB."); }
}
export async function libraryResponse(action: () => unknown | Promise<unknown>) {
  try { return Response.json(await action(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) {
    // The database survives Next hot reloads, including its original Error class.
    const storageError = error instanceof Error && (error instanceof LibraryError || error.name === "LibraryError") && "status" in error && [400, 401, 403, 404, 409, 503].includes(Number(error.status));
    const status = storageError ? Number(error.status) : error instanceof InputError ? 400 : 503;
    if (status === 503) console.error("[dashboard] Storage or access unavailable.");
    return Response.json({ error: status === 503 && !storageError ? "Project storage is unavailable. Your existing data has been kept; retry shortly." : error instanceof Error ? error.message : "Dashboard unavailable." }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
