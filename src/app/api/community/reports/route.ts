import {requireCommunityUser,communityResponse,communityBody} from "@/lib/community-access";
import {communityId} from "@/lib/community";
import { reportCommunityContent } from "@/lib/community-moderation";
import { CommunityError } from "@/lib/community";
export const runtime="nodejs";
export async function POST(request:Request){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);const body=await communityBody(request);if(body.kind === "comment" || body.kind === "profile")return reportCommunityContent(db,user.id,body.kind,body.id,body.reason);if(body.kind !== undefined && body.kind !== "post")throw new CommunityError("Choose a supported report type.");return db.reportPost(user.id,communityId(body.postId),body.reason);});}
