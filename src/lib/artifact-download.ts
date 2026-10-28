import { getArtifact, removeArtifact } from "./project-store";
import type { D1Database } from "./billing-db";

export async function downloadStoredArtifact(id:string,loadDatabase:()=>Promise<{BILLING_DB?:D1Database}>) {
  if (!/^[a-f0-9-]{36}$/.test(id))
    return Response.json({ error: "Invalid project ID." }, { status: 400 });
  const entry = getArtifact(id);
  let available=!!entry?.ownerAccountId;
  if(entry?.ownerAccountId) {
    try { const {BILLING_DB:db}=await loadDatabase(); const owner=await db?.prepare("SELECT deletion_requested_at FROM billing_accounts WHERE id=?").bind(entry.ownerAccountId).first<{deletion_requested_at:number|null}>(); available=!!owner && owner.deletion_requested_at===null; }
    catch { return Response.json({error:"Download access could not be verified. Please retry."},{status:503,headers:{"Cache-Control":"no-store"}}); }
  }
  if (!entry || !available) {
    removeArtifact(id);
    return Response.json(
      { error: "Artifact unavailable or expired. Generate the project again." },
      { status: 404 },
    );
  }
  const artifactType = entry.project.artifactType ?? "plugin";
  const extension = artifactType === "plugin" || artifactType === "mod" ? "jar" : "zip";
  const contentType = extension === "jar" ? "application/java-archive" : "application/zip";
  return new Response(new Uint8Array(entry.artifact), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${entry.project.name}.${extension}"`,
      "Content-Length": String(entry.artifact.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
