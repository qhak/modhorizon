import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CommunityPost, CommunityProfile } from "./community";
import { showcaseUrl } from "./community";

export function trustedCommunityOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash
      || !url.hostname.includes(".") || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/.test(url.hostname)) return null;
    return url.origin;
  } catch { return null; }
}
export async function communityOrigin(): Promise<string | null> {
  if (process.env.NODE_ENV !== "production") return null;
  let origin = process.env.APP_ORIGIN;
  try { origin = ((await getCloudflareContext({ async: true })).env as unknown as { APP_ORIGIN?: string }).APP_ORIGIN || origin; } catch { /* Standalone builds may use explicit environment. */ }
  return trustedCommunityOrigin(origin);
}
export async function communityMetadata(title: string, description: string, path: string, eligible = true, image?: string): Promise<Metadata> {
  const origin = await communityOrigin();
  const url = origin ? origin + path : undefined;
  return { title: `${title} · ModHorizon`, description, robots: { index: !!origin && eligible, follow: eligible },
    ...(url ? { alternates: { canonical: url }, openGraph: { type: "website", title, description, url, siteName: "ModHorizon", ...(image ? { images: [{ url: origin + image }] } : {}) } } : {}),
  };
}
export function safeStructuredData(value: unknown): string { return JSON.stringify(value).replace(/</g, "\\u003c"); }
export function profileStructuredData(profile: CommunityProfile, origin: string) {
  return { "@context": "https://schema.org", "@type": "ProfilePage", mainEntity: {
    "@type": "Person", name: profile.displayName, alternateName: profile.handle,
    description: profile.bio, url: `${origin}/creators/${profile.handle}`,
  } };
}
export function showcaseStructuredData(post: CommunityPost, origin: string) {
  return { "@context": "https://schema.org", "@type": "CreativeWork", name: post.title, description: post.summary,
    url: origin + showcaseUrl(post), datePublished: new Date(post.publishedAt || post.createdAt).toISOString(), dateModified: new Date(post.updatedAt).toISOString(),
    author: { "@type": "Person", name: post.author.displayName, url: `${origin}/creators/${post.author.handle}` },
    ...(post.coverImage ? { image: origin + post.coverImage } : {}),
  };
}
