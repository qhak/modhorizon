import { dataPackFormat } from "@/lib/datapack-versions";
import { exampleDatapack } from "@/lib/example-datapack";
import { packageMinecraftPack } from "@/lib/packager";

export const runtime = "nodejs";

export function GET(request: Request) {
  const version = new URL(request.url).searchParams.get("version") || "1.21.4";
  if (!dataPackFormat(version)) return Response.json({ error: "Choose a supported Minecraft Java release from 1.13 onward." }, { status: 400 });
  const { artifact } = packageMinecraftPack(exampleDatapack(version), "datapack", version);
  return new Response(new Uint8Array(artifact), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ModHorizonHello-${version}.zip"`,
      "Content-Length": String(artifact.length),
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
