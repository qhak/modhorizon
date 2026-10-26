import { requireCommunityModerator, communityResponse, communityBody } from "@/lib/community-access";
import { contentModerationQueue, moderateCommunityContent } from "@/lib/community-moderation";
export const runtime="nodejs";
export async function GET(request:Request) { return communityResponse(async()=>{ const {db}=await requireCommunityModerator(request);return contentModerationQueue(db,new URL(request.url).searchParams.get("q") || ""); }); }
export async function PATCH(request:Request) { return communityResponse(async()=>{ const {db,user}=await requireCommunityModerator(request);return moderateCommunityContent(db,user.id,await communityBody(request)); }); }
