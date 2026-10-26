import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifiedAuthUser } from "./account-auth";
import { limitedJson } from "./ai-provider";
import { hasAllowedOrigin } from "./request-origin";
import { CommunityError } from "./community";
import { communityDatabase } from "./community-db";

export function requireCommunityOrigin(request: Request): void {
  if (!request.headers.get("origin") || !hasAllowedOrigin(request) || request.headers.get("sec-fetch-site") === "cross-site")
    throw new CommunityError("A same-origin request is required.",403);
}
export async function requireCommunityUser(request: Request) {
  if (!["GET","HEAD"].includes(request.method)) requireCommunityOrigin(request);
  const user=await verifiedAuthUser();
  if(!user) throw new CommunityError("Sign in with a confirmed account to participate.",401);
  return { user,db:await communityDatabase() };
}
export function communityModeratorAllowed(userId: string, allowlist: string | undefined): boolean {
  return !!allowlist?.split(",").map(value=>value.trim()).filter(Boolean).includes(userId);
}
export async function isCommunityModerator(userId: string): Promise<boolean> {
  let value:string|undefined;
  try { value=((await getCloudflareContext({async:true})).env as unknown as {COMMUNITY_MODERATOR_IDS?:string}).COMMUNITY_MODERATOR_IDS; }
  catch { value=process.env.COMMUNITY_MODERATOR_IDS; }
  return communityModeratorAllowed(userId,value);
}
export async function requireCommunityModerator(request: Request) {
  const access=await requireCommunityUser(request);
  if(!await isCommunityModerator(access.user.id)) throw new CommunityError("Moderator access is required.",403);
  return access;
}
export async function communityBody(request: Request): Promise<Record<string,unknown>> {
  if(!request.headers.get("content-type")?.includes("application/json")) throw new CommunityError("Use application/json.",415);
  try {
    const data=await limitedJson(new Response(request.body),24_000);
    if(!data || typeof data!=="object"||Array.isArray(data)) throw new Error();
    return data as Record<string,unknown>;
  } catch { throw new CommunityError("Use a valid JSON object within the 24 KB limit."); }
}
export async function communityResponse(action:()=>unknown|Promise<unknown>):Promise<Response> {
  try { return Response.json(await action(),{headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}}); }
  catch(error) {
    const known=error instanceof Error&&error.name==="CommunityError"&&"status"in error;
    const status=known&&[400,401,403,404,409,415,429,503].includes(Number(error.status))?Number(error.status):503;
    if(status===503) console.error("[community] Storage or account service unavailable.");
    return Response.json({error:known?error.message:"Community is temporarily unavailable. Please try again shortly."},{status,headers:{"Cache-Control":"no-store"}});
  }
}
