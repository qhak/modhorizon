import { NextResponse } from "next/server";
import { SESSION_COOKIE, authenticatedLibrary, libraryBody, libraryResponse, requireLocalRequest, sessionCookie } from "@/lib/dashboard-auth";
import { dashboardDatabase } from "@/lib/dashboard-db";
import { object } from "@/lib/managed-project";
import { InputError } from "@/lib/validation";
export const runtime = "nodejs";
export function GET(request: Request) { return libraryResponse(async () => ({ profile: (await authenticatedLibrary(request)).db.profile() })); }
export async function POST(request: Request) {
  let token = "";
  const response = await libraryResponse(async () => {
    requireLocalRequest(request);
    const db = await dashboardDatabase();
    token = sessionCookie(request) ?? "";
    if (!db.session(token)) token = db.issueSession();
    return { profile: db.profile() };
  });
  if (!response.ok) return response;
  const result = new NextResponse(response.body, { headers: response.headers });
  result.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 7 * 86400, secure: new URL(request.url).protocol === "https:" });
  return result;
}
export function PATCH(request: Request) { return libraryResponse(async () => {
  const { db } = await authenticatedLibrary(request);
  const { displayName } = object(await libraryBody(request));
  if (typeof displayName !== "string" || displayName.trim().length > 60 || /[\u0000-\u001f\u007f]/.test(displayName)) throw new InputError("Use a display name of at most 60 characters without control characters.");
  return { profile: db.setDisplayName(displayName.trim()) };
}); }
export async function DELETE(request: Request) {
  const response = await libraryResponse(async () => { const { db } = await authenticatedLibrary(request); db.revokeSession(sessionCookie(request)!); return { signedOut: true }; });
  if (!response.ok) return response;
  const result = new NextResponse(response.body, { headers: response.headers });
  result.cookies.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return result;
}
