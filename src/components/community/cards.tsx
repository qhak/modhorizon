import Link from "next/link";
import { ArrowUpRight, Blocks, Code2, Eclipse, Heart, ImageIcon, Layers, MessageCircle, Package } from "lucide-react";
import type { CommunityPost, CommunityProfile } from "@/lib/community";

export const KIND_LABELS: Record<string, string> = { plugin: "Plugins", mod: "Mods", shader_pack: "Shaders", resource_pack: "Resource packs", datapack: "Datapacks" };
export const KIND_SINGULAR: Record<string, string> = { plugin: "Plugin", mod: "Mod", shader_pack: "Shader pack", resource_pack: "Resource pack", datapack: "Datapack" };
const ICONS = { plugin: Code2, mod: Blocks, shader_pack: Eclipse, resource_pack: ImageIcon, datapack: Package };
export function creatorInitials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "M"; }
export const showcaseHref = (post: Pick<CommunityPost, "id" | "slug">) => `/showcase/${post.id}/${post.slug}`;
export function CreatorAvatar({ name, large = false }: { name: string; large?: boolean }) { return <span className={`cm-avatar ${large ? "cm-avatar-large" : ""}`} aria-hidden="true">{creatorInitials(name)}</span>; }

export function ShowcaseCard({ post, preview = false }: { post: CommunityPost; preview?: boolean }) {
  const Icon = ICONS[post.kind] || Layers;
  const href = preview ? `/community/preview?project=${post.slug}` : showcaseHref(post);
  const creatorHref = preview ? "/community/preview?creator=modhorizon-preview" : `/creators/${post.author.handle}`;
  return <article className="cm-card"><Link href={href} className="cm-card-cover" aria-label={`View ${post.title}`}>
    {post.coverImage ? <img src={post.coverImage} alt={`${post.title} showcase`} loading="lazy" /> : <div className="cm-cover-placeholder"><Icon size={42} strokeWidth={1} /><span>{KIND_SINGULAR[post.kind]}</span></div>}
    <span className="cm-card-kind"><Icon size={12} />{KIND_SINGULAR[post.kind]}</span><span className="cm-cover-open"><ArrowUpRight size={17} /></span>
  </Link><div className="cm-card-body"><div className="cm-card-meta"><span>{post.target}</span><span>·</span><span>{post.version}</span></div>
    <h2><Link href={href}>{post.title}</Link></h2><p>{post.summary}</p>
    <div className="cm-card-tags">{post.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
    <div className="cm-card-bottom"><Link className="cm-creator-link" href={creatorHref}><CreatorAvatar name={post.author.displayName} /><span>{post.author.displayName}</span></Link>
      {!preview && <span className="cm-card-counts"><span title="Likes"><Heart size={12} />{post.likes}</span><span title="Comments"><MessageCircle size={12} />{post.comments}</span></span>}
      {preview && <span className="cm-sample-label">Sample</span>}
    </div></div></article>;
}

export function CreatorHeader({ profile, preview = false, children }: { profile: CommunityProfile; preview?: boolean; children?: React.ReactNode }) {
  return <><div className="cm-profile-banner"><span className="cm-profile-orbit" /><span>CREATOR SPACE</span></div><section className="cm-profile-heading"><CreatorAvatar name={profile.displayName} large /><div className="cm-profile-copy"><span className="cm-eyebrow">@{profile.handle}</span><h1>{profile.displayName}</h1><p>{profile.bio || "A Minecraft creator sharing what they build."}</p>{profile.website && <a className="cm-inline-link" href={profile.website} rel="nofollow ugc noreferrer" target="_blank">Creator website <ArrowUpRight size={13} /></a>}<div className="cm-profile-stats"><span><strong>{profile.showcaseCount}</strong> {preview ? "sample showcases" : "showcases"}</span>{!preview && <><span><strong>{profile.followerCount}</strong> followers</span><span><strong>{profile.followingCount}</strong> following</span></>}</div></div><div className="cm-profile-actions">{children}</div></section></>;
}
