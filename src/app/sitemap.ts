import type { MetadataRoute } from "next";
import { communityOrigin } from "@/lib/community-seo";
import { communityDatabase } from "@/lib/community-db";
import { showcaseUrl } from "@/lib/community";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await communityOrigin(); if (!origin) return [];
  const posts = await (await communityDatabase()).sitemapPosts();
  return [{ url: origin }, { url: origin + "/explore" }, ...posts.map(post => ({ url: origin + showcaseUrl(post), lastModified: new Date(post.updatedAt) })), ...Array.from(new Set(posts.map(post => post.author.handle)), handle => ({ url: origin + "/creators/" + handle }))];
}
