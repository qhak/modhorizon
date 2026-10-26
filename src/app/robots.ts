import type { MetadataRoute } from "next";
import { communityOrigin } from "@/lib/community-seo";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await communityOrigin();
  return origin ? { rules: { userAgent: "*", allow: ["/", "/explore", "/creators/", "/showcase/"], disallow: ["/api/", "/workspace", "/community", "/account"] }, sitemap: origin + "/sitemap.xml" } : { rules: { userAgent: "*", disallow: "/" } };
}
