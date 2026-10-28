import { notFound, redirect } from "next/navigation";
import { CommunityShell } from "@/components/community/shell";
import { ShowcaseView } from "@/components/community/views";
import { communityDatabase } from "@/lib/community-db";
import { COMMUNITY_ID, showcaseUrl } from "@/lib/community";
import { communityMetadata, communityOrigin, safeStructuredData, showcaseStructuredData } from "@/lib/community-seo";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; slug: string }> };
async function publicPost(id: string) { if (id.length !== 36 || !COMMUNITY_ID.test(id)) return null; return (await communityDatabase()).getPost(id); }
export async function generateMetadata({ params }: Props) {
  const { id } = await params, post = await publicPost(id);
  return communityMetadata(post?.title || "Showcase unavailable", post?.summary || "This showcase is not publicly available.", post ? showcaseUrl(post) : "/explore", !!post, post?.coverImage);
}
export default async function Showcase({ params }: Props) {
  const { id, slug } = await params, post = await publicPost(id);
  if (!post) notFound();
  if (slug !== post.slug) redirect(showcaseUrl(post));
  const comments = await (await communityDatabase()).listComments(id), origin = await communityOrigin();
  return <CommunityShell>{origin && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeStructuredData(showcaseStructuredData(post, origin)) }} />}<ShowcaseView post={post} comments={comments} /></CommunityShell>;
}
