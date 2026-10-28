import {requireCommunityUser,communityResponse} from "@/lib/community-access";
export const runtime="nodejs";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);const id=(await context.params).id;await db.requirePublished(id);const post=await db.getPost(id,user.id);return {liked:!!post?.viewerLiked,likes:post?.likes||0};});}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);return db.toggleLike(user.id,(await context.params).id);});}
