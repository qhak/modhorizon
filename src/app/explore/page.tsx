import Link from "next/link";
import { CommunityShell } from "@/components/community/shell";
import { Gallery, GalleryFilters, GalleryHeading } from "@/components/community/views";
import { communityDatabase } from "@/lib/community-db";
import { communityMetadata } from "@/lib/community-seo";
import type { CommunityPost } from "@/lib/community";
export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({ searchParams }: Props) {
  const query = await searchParams;
  return communityMetadata("Explore creations", "Discover Minecraft creations and the people who build them.", "/explore", !Object.values(query).some(Boolean));
}
export default async function Explore({ searchParams }: Props) {
  const raw = await searchParams;
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] as string : "";
  const q = value("q").slice(0, 100), kind = value("kind"), tag = value("tag"), cursor = value("cursor"), author = value("author");
  let posts: CommunityPost[] = [], nextCursor: string | null = null, unavailable = false;
  try { ({ posts, nextCursor } = await (await communityDatabase()).listPosts({ q, kind, tag, cursor, author })); } catch { unavailable = true; }
  return <CommunityShell><GalleryHeading /><GalleryFilters q={q} kind={kind} />{(tag || author) && <p className="cm-notice">{tag ? `Tagged: ${tag}` : `Creator: @${author}`} · <Link href="/explore">Clear filter</Link></p>}{unavailable ? <p className="cm-notice" role="alert">Community discovery is temporarily unavailable. Please try again shortly.</p> : <Gallery posts={posts} />}{nextCursor && <Link className="cm-button" href={`/explore?${new URLSearchParams({ q, kind, tag, author, cursor: nextCursor })}`}>More creations →</Link>}</CommunityShell>;
}
