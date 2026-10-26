import { requireCommunityUser,communityResponse,isCommunityModerator } from "@/lib/community-access";
export const runtime="nodejs";
export async function GET(request:Request){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);return {...await db.me(user.id),isModerator:await isCommunityModerator(user.id)};});}
