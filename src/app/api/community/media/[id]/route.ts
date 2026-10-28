import { verifiedAuthUser } from "@/lib/account-auth";
import { communityResponse, isCommunityModerator } from "@/lib/community-access";
import { communityDatabase } from "@/lib/community-db";
import { readCommunityImage } from "@/lib/community-media";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const db = await communityDatabase();
    let image;
    try { image = await readCommunityImage(db.db, id); }
    catch (error) {
      const user = await verifiedAuthUser();
      if (!user) throw error;
      image = await readCommunityImage(db.db, id, user.id, await isCommunityModerator(user.id));
    }
    return new Response(new Uint8Array(image.bytes), { headers: {
      "Content-Type": image.contentType, "Content-Length": String(image.bytes.length),
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch (error) { return communityResponse(() => { throw error; }); }
}
