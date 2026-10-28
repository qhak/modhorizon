import {requireCommunityUser,communityResponse,communityBody} from "@/lib/community-access";
import {communityDatabase} from "@/lib/community-db";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){return communityResponse(async()=>({comments:await(await communityDatabase()).listComments((await context.params).id)}));}
export async function POST(request:Request,context:Context){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);const body=await communityBody(request);return {comment:await db.addComment(user.id,(await context.params).id,body.text)};});}
