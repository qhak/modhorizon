import { getArtifact } from "@/lib/project-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/.test(id))
    return Response.json({ error: "Invalid project ID." }, { status: 400 });
  const entry = getArtifact(id);
  if (!entry)
    return Response.json(
      { error: "Artifact unavailable or expired. Generate the project again." },
      { status: 404 },
    );
  const extension = entry.project.artifactType === "plugin" || entry.project.artifactType === "mod" ? "jar" : "zip";
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
