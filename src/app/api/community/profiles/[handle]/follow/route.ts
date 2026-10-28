import {requireCommunityUser,communityResponse} from "@/lib/community-access";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{handle:string}>}){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);return db.followState(user.id,(await context.params).handle);});}
export async function POST(request:Request,context:{params:Promise<{handle:string}>}){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);return db.toggleFollow(user.id,(await context.params).handle);});}
