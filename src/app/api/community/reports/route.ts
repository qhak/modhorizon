import {requireCommunityUser,communityResponse,communityBody} from "@/lib/community-access";
import {communityId} from "@/lib/community";
export const runtime="nodejs";
export async function POST(request:Request){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);const body=await communityBody(request);return db.reportPost(user.id,communityId(body.postId),body.reason);});}
