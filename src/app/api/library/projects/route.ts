import { authenticatedLibrary, libraryBody, libraryResponse } from "@/lib/dashboard-auth";
import { object, validateCreation, validateSnapshot } from "@/lib/managed-project";
import { InputError } from "@/lib/validation";
export const runtime = "nodejs";
export function GET(request: Request) { return libraryResponse(async () => { const { db, ownerId } = await authenticatedLibrary(request); return { projects: db.list(ownerId) }; }); }
export function POST(request: Request) { return libraryResponse(async () => {
  const { db, ownerId } = await authenticatedLibrary(request);
  const body = object(await libraryBody(request)), input = validateCreation(body);
  const snapshot = body.importSnapshot === undefined ? undefined : validateSnapshot(body.importSnapshot);
  if (snapshot && (snapshot.version !== input.version || snapshot.artifactType !== input.kind || snapshot.target !== input.platform)) throw new InputError("Source artifact type, target, and version must match the project.");
  return { project: db.create(ownerId, input, snapshot) };
}); }
