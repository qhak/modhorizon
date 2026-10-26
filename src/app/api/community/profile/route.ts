import { requireCommunityUser,communityResponse,communityBody } from "@/lib/community-access";
export const runtime="nodejs";
export async function PATCH(request:Request){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);return {profile:await db.setProfile(user.id,await communityBody(request))};});}
