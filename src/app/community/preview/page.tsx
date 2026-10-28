import { CommunityShell } from "@/components/community/shell";
import { CreatorHeader } from "@/components/community/cards";
import { Gallery, GalleryFilters, GalleryHeading, ShowcaseView } from "@/components/community/views";
import { previewPosts, previewProfile } from "@/components/community/demo";
export const metadata = { title: "Community design preview · ModHorizon", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { project, creator, kind = "", q = "" } = await searchParams;
  const post = previewPosts.find(item => item.slug === project);
  const posts = previewPosts.filter(item => (!kind || kind === item.kind) && (!q || `${item.title} ${item.summary}`.toLowerCase().includes(q.toLowerCase())));
  return <CommunityShell preview>{post ? <ShowcaseView post={post} preview /> : creator ? <><CreatorHeader profile={previewProfile} preview /><Gallery posts={previewPosts} preview /></> : <><GalleryHeading /><GalleryFilters kind={kind} q={q} preview /><Gallery posts={posts} preview /></>}</CommunityShell>;
}
