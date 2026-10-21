import { serviceStatus } from "@/lib/service-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(serviceStatus(), {
    headers: { "Cache-Control": "no-store" },
  });
}
