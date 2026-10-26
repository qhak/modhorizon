import { requireCommunityUser, communityResponse } from "@/lib/community-access";
import { limitedJson } from "@/lib/ai-provider";
import { CommunityError } from "@/lib/community";
import { storeCommunityImage } from "@/lib/community-media";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return communityResponse(async () => {
    const { user, db } = await requireCommunityUser(request);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new CommunityError("Use application/json.", 415);
    let body: unknown;
    try { body = await limitedJson(new Response(request.body), 1_100_000); }
    catch { throw new CommunityError("Upload a screenshot within the 768 KB image limit."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new CommunityError("Upload a screenshot.");
    return storeCommunityImage(db.db, user.id, (body as Record<string, unknown>).dataUrl);
  });
}
