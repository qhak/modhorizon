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
      { error: "Artifact unavailable or expired. Generate the plugin again." },
      { status: 404 },
    );
  return new Response(new Uint8Array(entry.artifact), {
    headers: {
      "Content-Type": "application/java-archive",
      "Content-Disposition": `attachment; filename="${entry.project.name}.jar"`,
      "Content-Length": String(entry.artifact.length),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
