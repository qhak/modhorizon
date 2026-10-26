import { notFound } from "next/navigation";
import { CommunityShell } from "@/components/community/shell";
import { CreatorHeader } from "@/components/community/cards";
import { Gallery } from "@/components/community/views";
import { FollowCreator } from "@/components/community/interactions";
import { communityDatabase } from "@/lib/community-db";
import { communityMetadata, communityOrigin, profileStructuredData, safeStructuredData } from "@/lib/community-seo";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ handle: string }> };
export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const profile = await (await communityDatabase()).getProfile(handle);
  return communityMetadata(profile?.displayName || "Creator", profile?.bio || "Minecraft creator profile.", `/creators/${handle}`, !!profile?.showcaseCount);
}
export default async function Creator({ params }: Props) {
  const { handle } = await params, db = await communityDatabase(), profile = await db.getProfile(handle);
  if (!profile) notFound();
  const { posts } = await db.listPosts({ author: handle, limit: 24 }), origin = await communityOrigin();
  return <CommunityShell>{origin && profile.showcaseCount > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeStructuredData(profileStructuredData(profile, origin)) }} />}<CreatorHeader profile={profile}><FollowCreator handle={handle} initialCount={profile.followerCount} /></CreatorHeader><div className="cm-section-label"><h2>Published creations</h2><span>{profile.showcaseCount} showcases</span></div><Gallery posts={posts} /></CommunityShell>;
}
