import { authenticatedLibrary, libraryBody, libraryResponse } from "@/lib/dashboard-auth";
import { object, projectName, validateSnapshot } from "@/lib/managed-project";
import { InputError } from "@/lib/validation";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export function GET(request: Request, { params }: Context) { return libraryResponse(async () => { const { db, ownerId } = await authenticatedLibrary(request); return { project: db.get(ownerId, (await params).id) }; }); }
export function PATCH(request: Request, { params }: Context) { return libraryResponse(async () => {
  const { db, ownerId } = await authenticatedLibrary(request), body = object(await libraryBody(request));
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1) throw new InputError("A valid project revision is required.");
  if (body.starred !== undefined && typeof body.starred !== "boolean") throw new InputError("Starred must be true or false.");
  if (body.name === undefined && body.starred === undefined && body.snapshot === undefined) throw new InputError("No supported changes supplied.");
  return { project: db.update(ownerId, (await params).id, Number(body.revision), {
    ...(body.name !== undefined ? { name: projectName(body.name) } : {}),
    ...(body.starred !== undefined ? { starred: body.starred as boolean } : {}),
    ...(body.snapshot !== undefined ? { snapshot: validateSnapshot(body.snapshot) } : {}),
  }) };
}); }
export function DELETE(request: Request, { params }: Context) { return libraryResponse(async () => {
  const { db, ownerId } = await authenticatedLibrary(request), body = object(await libraryBody(request));
  if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1) throw new InputError("A valid project revision is required.");
  db.delete(ownerId, (await params).id, Number(body.revision)); return { deleted: true };
}); }
