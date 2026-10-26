import type { ArtifactType } from "./types";
import { MINECRAFT_VERSIONS } from "./types";
import { PLATFORMS, isPlatformId } from "./platforms";

export class CommunityError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = "CommunityError"; }
}
export const COMMUNITY_KINDS = ["plugin", "mod", "datapack", "resource_pack", "shader_pack"] as const;
export type CommunityStatus = "draft" | "pending" | "published" | "rejected" | "hidden";
export type CommunityTesting = "untested" | "creator-tested";
export type CommunityAuthor = { handle: string; displayName: string };
export type CommunityProfile = CommunityAuthor & { bio: string; website: string; createdAt: number; showcaseCount: number; followerCount: number; followingCount: number; moderationStatus?: "active" | "hidden" };
export type CommunityPost = {
  id: string; slug: string; title: string; summary: string; description: string; instructions: string;
  kind: ArtifactType; target: string; version: string; tags: string[]; coverImage: string; downloadUrl: string;
  testing: CommunityTesting; status: CommunityStatus; author: CommunityAuthor;
  createdAt: number; updatedAt: number; publishedAt: number | null; likes: number; comments: number; viewerLiked?: boolean;
};
export type CommunityComment = { id: string; text: string; author: CommunityAuthor; createdAt: number };
export type CommunityPostInput = Pick<CommunityPost, "title" | "summary" | "description" | "instructions" | "kind" | "target" | "version" | "tags" | "coverImage" | "downloadUrl" | "testing"> & { submitForReview: boolean };
export type CommunityProfileInput = Pick<CommunityProfile, "handle" | "displayName" | "bio" | "website">;
export type CommunityListOptions = { q?: string; kind?: string; tag?: string; author?: string; cursor?: string; limit?: number };
export const COMMUNITY_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export function communityId(value: unknown): string {
  if (typeof value !== "string" || value.length !== 36 || !COMMUNITY_ID.test(value)) throw new CommunityError("Invalid showcase identifier.");
  return value;
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new CommunityError("A JSON object is required.");
  return value as Record<string, unknown>;
}
export function communityText(value: unknown, name: string, min: number, max: number): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))
    throw new CommunityError(`${name} must contain ${min}–${max} text characters.`);
  return value.trim();
}
export function validateCommunityProfile(value: unknown): CommunityProfileInput {
  const input = object(value);
  const handle = communityText(input.handle, "Handle", 3, 24);
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(handle) || ["admin","api","explore","moderation","modhorizon","profile","settings","showcase","support"].includes(handle))
    throw new CommunityError("Choose an available lowercase handle, starting with a letter and using letters, numbers or underscores.");
  const displayName = communityText(input.displayName, "Display name", 1, 60);
  const bio = communityText(input.bio ?? "", "Bio", 0, 280);
  const website = communityText(input.website ?? "", "Website", 0, 300);
  if (website) {
    let url: URL;
    try { url = new URL(website); } catch { throw new CommunityError("Website must be a public HTTPS URL."); }
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".") || /^(?:localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|\[)/.test(url.hostname))
      throw new CommunityError("Website must be a public HTTPS URL without credentials.");
  }
  return { handle, displayName, bio, website };
}
export function validateCommunityPost(value: unknown): CommunityPostInput {
  const input = object(value);
  const kind = input.kind;
  if (!(COMMUNITY_KINDS as readonly unknown[]).includes(kind)) throw new CommunityError("Choose a supported creation type.");
  const target = communityText(input.target, "Target", 1, 24);
  const version = communityText(input.version, "Minecraft version", 1, 24);
  if (!MINECRAFT_VERSIONS.includes(version)) throw new CommunityError("Choose a supported Minecraft version.");
  const validTarget = kind === "plugin" ? isPlatformId(target) && PLATFORMS[target].kind !== "mod"
    : kind === "mod" ? isPlatformId(target) && PLATFORMS[target].kind === "mod"
    : kind === "shader_pack" ? ["iris","optifine"].includes(target) : target === "vanilla";
  if (!validTarget) throw new CommunityError("Choose a compatible target for this creation type.");
  if (!Array.isArray(input.tags) || input.tags.length > 5 || input.tags.some(tag => typeof tag !== "string" || !/^[a-z0-9][a-z0-9-]{0,23}$/.test(tag)))
    throw new CommunityError("Use up to five lowercase tags, with letters, numbers and hyphens.");
  const coverImage = communityText(input.coverImage ?? "", "Cover image", 0, 200);
  if (coverImage && !/^\/api\/community\/media\/[a-f0-9-]{36}$/.test(coverImage)) throw new CommunityError("Upload a screenshot for the showcase cover.");
  const downloadUrl = communityText(input.downloadUrl ?? "", "Creator download URL", 0, 500);
  if (downloadUrl) {
    let url: URL;
    try { url = new URL(downloadUrl); } catch { throw new CommunityError("Use a GitHub, Modrinth or CurseForge HTTPS download page."); }
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") || !["github.com","modrinth.com","curseforge.com","www.curseforge.com"].includes(url.hostname))
      throw new CommunityError("Use a GitHub, Modrinth or CurseForge HTTPS download page without credentials or custom ports.");
  }
  const testing = input.testing ?? "untested";
  if (testing !== "untested" && testing !== "creator-tested") throw new CommunityError("Choose an accurate creator testing status.");
  if (input.submitForReview !== undefined && typeof input.submitForReview !== "boolean") throw new CommunityError("Review submission must be a boolean.");
  return {
    title: communityText(input.title, "Title", 5, 100), summary: communityText(input.summary, "Summary", 40, 240),
    description: communityText(input.description, "Description", 120, 6000), instructions: communityText(input.instructions ?? "", "Installation instructions", 0, 4000),
    kind: kind as ArtifactType, target, version, tags: [...new Set(input.tags as string[])], coverImage, downloadUrl, testing,
    submitForReview: input.submitForReview === true,
  };
}
export function showcaseSlug(title: string): string { return title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "creation"; }
export function showcaseUrl(post: Pick<CommunityPost, "id" | "slug">): string { return `/showcase/${post.id}/${post.slug}`; }
