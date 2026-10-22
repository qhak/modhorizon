import { createAIProvider, limitedJson } from "@/lib/ai-provider";
import { createBuildService } from "@/lib/build-service";
import { generateArtifact } from "@/lib/generation";
import { serviceStatus } from "@/lib/service-status";
import { artifactCatalog } from "@/lib/artifact-experts";
import {
  InputError,
  MAX_REQUEST_BYTES,
  validateRequest,
} from "@/lib/validation";
import { hasAllowedOrigin } from "@/lib/request-origin";

export const runtime = "nodejs";
export const maxDuration = 900;
// Process-local guard only. Public deployments require authenticated quotas and a durable job queue.
let active = 0;

export async function GET() {
  return Response.json(
    { artifacts: artifactCatalog() },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}

export async function POST(request: Request) {
  if (!hasAllowedOrigin(request))
    return Response.json(
      { error: "Cross-origin generation is not allowed." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "Use application/json." }, { status: 415 });
  if (active >= 2)
    return Response.json(
      { error: "Two generations are already running. Try again shortly." },
      { status: 429 },
    );
  active++;
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_REQUEST_BYTES)
      return Response.json(
        { error: "Request exceeds 200 KB." },
        { status: 413 },
      );
    let body: unknown;
    try {
      body = await limitedJson(new Response(request.body), MAX_REQUEST_BYTES);
    } catch {
      return Response.json(
        { error: "Request must contain valid JSON within the 200 KB limit." },
        { status: 400 },
      );
    }
    const input = validateRequest(body);
    if (!serviceStatus().choices[input.modelId || ""])
      throw new InputError("That model is unavailable. Connect its provider first.");
    const project = await generateArtifact(
      input,
      createAIProvider(input.modelId || ""),
      createBuildService(),
    );
    return Response.json(
      { project },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Generation is unavailable.",
      },
      { status: error instanceof InputError ? 400 : 503 },
    );
  } finally {
    active--;
  }
}
