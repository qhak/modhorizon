import { requireCommunityUser,communityResponse,communityBody } from "@/lib/community-access";
import {communityDatabase} from "@/lib/community-db";
export const runtime="nodejs";
export async function GET(request:Request){return communityResponse(async()=>{const query=new URL(request.url).searchParams;return (await communityDatabase()).listPosts({q:query.get("q")||undefined,kind:query.get("kind")||undefined,tag:query.get("tag")||undefined,author:query.get("author")||undefined,cursor:query.get("cursor")||undefined});});}
export async function POST(request:Request){return communityResponse(async()=>{const {user,db}=await requireCommunityUser(request);return {post:await db.savePost(user.id,await communityBody(request))};});}
