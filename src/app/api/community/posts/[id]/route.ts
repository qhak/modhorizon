import {requireCommunityUser,communityResponse,communityBody} from "@/lib/community-access";
import {verifiedAuthUser} from "@/lib/account-auth";
import {communityDatabase} from "@/lib/community-db";
import {CommunityError} from "@/lib/community";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){return communityResponse(async()=>{const {id}=await context.params;const db=await communityDatabase();let post=await db.getPost(id);if(!post){const user=await verifiedAuthUser();if(user)post=await db.getPost(id,user.id);}if(!post)throw new CommunityError("Showcase not found.",404);return {post};});}
export async function PATCH(request:Request,context:Context){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);const {id}=await context.params;return {post:await db.savePost(user.id,await communityBody(request),id)};});}
export async function DELETE(request:Request,context:Context){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);const {id}=await context.params;return db.withdrawPost(user.id,id);});}
