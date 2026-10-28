import { randomUUID } from "node:crypto";
import type { D1Database } from "./billing-db";
import { billingEnv } from "./billing-service";
import { CommunityError, communityId, communityText, showcaseSlug, validateCommunityPost, validateCommunityProfile,
  type CommunityComment, type CommunityListOptions, type CommunityPost, type CommunityProfile, type CommunityStatus } from "./community";

type Row = Record<string, unknown>;
const postSelect = `SELECT p.id,p.slug,p.title,p.summary,p.description,p.instructions,p.kind,p.target,p.version,p.tags,p.cover_image,p.download_url,p.testing,p.status,p.created_at,p.updated_at,p.published_at,
  a.handle,a.display_name,
  (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) AS likes,
  (SELECT COUNT(*) FROM community_comments c JOIN community_profiles ca ON ca.owner_id=c.owner_id WHERE c.post_id=p.id AND c.hidden=0 AND ca.moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=ca.owner_id)) AS comments
  FROM community_posts p JOIN community_profiles a ON a.owner_id=p.owner_id`;
function post(row: Row): CommunityPost {
  return { id: String(row.id), slug: String(row.slug), title: String(row.title), summary: String(row.summary), description: String(row.description), instructions: String(row.instructions),
    kind: row.kind as CommunityPost["kind"], target: String(row.target), version: String(row.version), tags: JSON.parse(String(row.tags)), coverImage: String(row.cover_image), downloadUrl: String(row.download_url),
    testing: row.testing as CommunityPost["testing"], status: row.status as CommunityStatus, author: { handle: String(row.handle), displayName: String(row.display_name) },
    createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), publishedAt: row.published_at == null ? null : Number(row.published_at), likes: Number(row.likes), comments: Number(row.comments) };
}
export class CommunityDatabase {
  constructor(readonly db: D1Database) {}
  async rateLimit(ownerId: string, action: string, limit: number, windowMs = 3600_000) {
    const now = Date.now();
    const result = await this.db.prepare(`INSERT INTO community_activity(id,owner_id,action,created_at)
      SELECT ?,?,?,? WHERE (SELECT COUNT(*) FROM community_activity WHERE owner_id=? AND action=? AND created_at>?) < ?`)
      .bind(randomUUID(), ownerId, action, now, ownerId, action, now-windowMs, limit).run();
    if (!result.meta.changes) throw new CommunityError("Too many community actions. Please try again later.", 429);
  }
  async profileForOwner(ownerId: string): Promise<CommunityProfile | null> {
    const row = await this.db.prepare("SELECT handle FROM community_profiles WHERE owner_id=?").bind(ownerId).first<Row>();
    return row ? this.getProfile(String(row.handle),true) : null;
  }
  async requireProfile(ownerId: string) {
    const value = await this.profileForOwner(ownerId);
    if (!value) throw new CommunityError("Create your public creator profile first.", 409);
    if(value.moderationStatus === "hidden") throw new CommunityError("Your community profile is hidden by moderation.",403);
    return value;
  }
  async getProfile(handle: string, includeHidden = false): Promise<CommunityProfile | null> {
    if (!/^[a-z][a-z0-9_]{2,23}$/.test(handle)) return null;
    const row = await this.db.prepare(`SELECT a.handle,a.display_name,a.bio,a.website,a.created_at,a.moderation_status,
      (SELECT COUNT(*) FROM community_posts p WHERE p.owner_id=a.owner_id AND p.status='published') AS showcase_count,
      (SELECT COUNT(*) FROM community_follows f WHERE f.target_owner_id=a.owner_id) AS follower_count,
      (SELECT COUNT(*) FROM community_follows f WHERE f.owner_id=a.owner_id) AS following_count
      FROM community_profiles a WHERE a.handle=? AND (?=1 OR (a.moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=a.owner_id)))`).bind(handle,includeHidden?1:0).first<Row>();
    return row ? { handle: String(row.handle), displayName: String(row.display_name), bio: String(row.bio), website: String(row.website), createdAt: Number(row.created_at),
      moderationStatus: row.moderation_status as "active"|"hidden", showcaseCount: Number(row.showcase_count), followerCount: Number(row.follower_count), followingCount: Number(row.following_count) } : null;
  }
  async setProfile(ownerId: string, value: unknown): Promise<CommunityProfile> {
    const input = validateCommunityProfile(value);
    await this.rateLimit(ownerId,"profile",20);
    const current = await this.profileForOwner(ownerId);
    if(current?.moderationStatus === "hidden") throw new CommunityError("Your profile is hidden by moderation. Editing is restricted.",403);
    if (current && current.handle !== input.handle) throw new CommunityError("Public handles cannot be changed after creation, so shared links stay stable.",409);
    const taken = await this.db.prepare("SELECT owner_id FROM community_profiles WHERE handle=? AND owner_id!=?").bind(input.handle,ownerId).first();
    if (taken) throw new CommunityError("That handle is already taken.",409);
    const now = Date.now();
    try {
      await this.db.prepare(`INSERT INTO community_profiles(owner_id,handle,display_name,bio,website,created_at,updated_at) VALUES(?,?,?,?,?,?,?)
        ON CONFLICT(owner_id) DO UPDATE SET display_name=excluded.display_name,bio=excluded.bio,website=excluded.website,updated_at=excluded.updated_at`)
        .bind(ownerId,input.handle,input.displayName,input.bio,input.website,now,now).run();
    } catch { throw new CommunityError("That profile could not be saved. Check handle availability and try again.",409); }
    return (await this.getProfile(input.handle))!;
  }
  async me(ownerId: string) {
    const profile = await this.profileForOwner(ownerId);
    const result = await this.db.prepare(`${postSelect} WHERE p.owner_id=? ORDER BY p.updated_at DESC LIMIT 100`).bind(ownerId).all<Row>();
    return { profile, posts: (result.results || []).map(post) };
  }
  async listPosts(options: CommunityListOptions = {}): Promise<{ posts: CommunityPost[]; nextCursor: string | null }> {
    const where = ["p.status='published'", "a.moderation_status='active'", "NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=a.owner_id)"];
    const args: unknown[] = [];
    if (options.kind) { where.push("p.kind=?"); args.push(options.kind.slice(0,30)); }
    if (options.author) { where.push("a.handle=?"); args.push(options.author.slice(0,24)); }
    if (options.q) { where.push("(p.title LIKE ? ESCAPE '\\' OR p.summary LIKE ? ESCAPE '\\')"); const q=`%${options.q.slice(0,100).replace(/[\\%_]/g,"\\$&")}%`; args.push(q,q); }
    if (options.tag) { where.push("EXISTS(SELECT 1 FROM json_each(p.tags) WHERE value=?)"); args.push(options.tag.slice(0,24)); }
    if (options.cursor) {
      const match = /^(\d{1,15}):([a-f0-9-]{36})$/.exec(options.cursor);
      if (!match) throw new CommunityError("Invalid community page cursor.");
      communityId(match[2]);
      where.push("(p.created_at<? OR (p.created_at=? AND p.id<?))"); args.push(Number(match[1]),Number(match[1]),match[2]);
    }
    const limit = Math.max(1,Math.min(24,Number.isSafeInteger(options.limit) ? options.limit! : 12));
    const result = await this.db.prepare(`${postSelect} WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC,p.id DESC LIMIT ?`).bind(...args,limit+1).all<Row>();
    const rows = result.results || [];
    const last = rows[Math.min(limit,rows.length)-1];
    return { posts: rows.slice(0,limit).map(post), nextCursor: rows.length > limit && last ? `${last.created_at}:${last.id}` : null };
  }
  async sitemapPosts(): Promise<CommunityPost[]> {
    const result = await this.db.prepare(`${postSelect} WHERE p.status='published' AND a.moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=a.owner_id) ORDER BY p.updated_at DESC LIMIT 1000`).all<Row>();
    return (result.results || []).map(post);
  }
  async getPost(id: string, ownerId?: string): Promise<CommunityPost | null> {
    communityId(id);
    const row = await this.db.prepare(`${postSelect} WHERE p.id=? AND ((p.status='published' AND a.moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=a.owner_id)) OR p.owner_id=?)`).bind(id,ownerId || "").first<Row>();
    if (!row) return null;
    const result = post(row);
    if (ownerId) result.viewerLiked = !!await this.db.prepare("SELECT 1 FROM community_likes WHERE owner_id=? AND post_id=?").bind(ownerId,id).first();
    return result;
  }
  async savePost(ownerId: string, value: unknown, id?: string): Promise<CommunityPost> {
    const input = validateCommunityPost(value);
    await this.requireProfile(ownerId);
    if (id) {
      communityId(id);
      const owned = await this.db.prepare("SELECT status FROM community_posts WHERE id=? AND owner_id=?").bind(id,ownerId).first<Row>();
      if (!owned) throw new CommunityError("Showcase not found.",404);
      if (owned.status === "hidden") throw new CommunityError("This showcase was hidden by moderation. Contact support before editing.",403);
    }
    if (input.coverImage) {
      const mediaId = communityId(input.coverImage.split("/").pop());
      if (!await this.db.prepare("SELECT 1 FROM community_media WHERE id=? AND owner_id=?").bind(mediaId,ownerId).first())
        throw new CommunityError("Choose a screenshot uploaded by your account.",403);
    }
    await this.rateLimit(ownerId,"post",20,86400_000);
    const status = input.submitForReview ? "pending" : "draft";
    const now = Date.now();
    const postId = id || randomUUID();
    if (id) {
      const updated = await this.db.prepare(`UPDATE community_posts SET title=?,summary=?,description=?,instructions=?,kind=?,target=?,version=?,tags=?,cover_image=?,download_url=?,testing=?,status=?,updated_at=MAX(?,updated_at+1),moderation_note='' WHERE id=? AND owner_id=? AND status!='hidden'`)
        .bind(input.title,input.summary,input.description,input.instructions,input.kind,input.target,input.version,JSON.stringify(input.tags),input.coverImage,input.downloadUrl,input.testing,status,now,id,ownerId).run();
      if(!updated.meta.changes) throw new CommunityError("Showcase is unavailable or changed during editing.",409);
    } else {
      await this.db.prepare(`INSERT INTO community_posts(id,owner_id,slug,title,summary,description,instructions,kind,target,version,tags,cover_image,download_url,testing,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(postId,ownerId,showcaseSlug(input.title),input.title,input.summary,input.description,input.instructions,input.kind,input.target,input.version,JSON.stringify(input.tags),input.coverImage,input.downloadUrl,input.testing,status,now,now).run();
    }
    return (await this.getPost(postId,ownerId))!;
  }
  async withdrawPost(ownerId: string,id: string) {
    communityId(id);
    const result = await this.db.prepare("UPDATE community_posts SET status='draft',updated_at=MAX(?,updated_at+1) WHERE id=? AND owner_id=? AND status!='hidden'").bind(Date.now(),id,ownerId).run();
    if (!result.meta.changes) throw new CommunityError("Showcase not found or unavailable.",404);
    return { withdrawn: true };
  }
  async requirePublished(id: string) { const value=await this.getPost(id); if(!value) throw new CommunityError("Showcase not found.",404); return value; }
  async toggleLike(ownerId: string,id: string) {
    await this.requireProfile(ownerId); await this.requirePublished(id); await this.rateLimit(ownerId,"like",120);
    const removed = await this.db.prepare("DELETE FROM community_likes WHERE owner_id=? AND post_id=?").bind(ownerId,id).run();
    if (!removed.meta.changes) await this.db.prepare("INSERT OR IGNORE INTO community_likes(owner_id,post_id,created_at) VALUES(?,?,?)").bind(ownerId,id,Date.now()).run();
    const liked=!!await this.db.prepare("SELECT 1 FROM community_likes WHERE owner_id=? AND post_id=?").bind(ownerId,id).first();
    const count=await this.db.prepare("SELECT COUNT(*) AS n FROM community_likes WHERE post_id=?").bind(id).first<Row>();
    return { liked, likes:Number(count?.n||0) };
  }
  async listComments(id: string): Promise<CommunityComment[]> {
    await this.requirePublished(id);
    const result=await this.db.prepare(`SELECT c.id,c.text,c.created_at,a.handle,a.display_name FROM community_comments c JOIN community_profiles a ON a.owner_id=c.owner_id WHERE c.post_id=? AND c.hidden=0 AND a.moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=a.owner_id) ORDER BY c.created_at,c.id LIMIT 100`).bind(id).all<Row>();
    return (result.results||[]).map(row=>({id:String(row.id),text:String(row.text),createdAt:Number(row.created_at),author:{handle:String(row.handle),displayName:String(row.display_name)}}));
  }
  async addComment(ownerId: string,id: string,value: unknown): Promise<CommunityComment> {
    const text=communityText(value,"Comment",1,1000);
    const author=await this.requireProfile(ownerId); await this.requirePublished(id); await this.rateLimit(ownerId,"comment",10);
    const comment={id:randomUUID(),text,createdAt:Date.now(),author:{handle:author.handle,displayName:author.displayName}};
    await this.db.prepare("INSERT INTO community_comments(id,owner_id,post_id,text,created_at) VALUES(?,?,?,?,?)").bind(comment.id,ownerId,id,text,comment.createdAt).run();
    return comment;
  }
  async toggleFollow(ownerId: string,handle: string) {
    await this.requireProfile(ownerId);
    const target=await this.db.prepare("SELECT owner_id FROM community_profiles WHERE handle=? AND moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=community_profiles.owner_id)").bind(handle).first<Row>();
    if(!target) throw new CommunityError("Creator not found.",404);
    if(target.owner_id===ownerId) throw new CommunityError("You cannot follow your own profile.");
    await this.rateLimit(ownerId,"follow",60);
    const removed=await this.db.prepare("DELETE FROM community_follows WHERE owner_id=? AND target_owner_id=?").bind(ownerId,target.owner_id).run();
    if(!removed.meta.changes) await this.db.prepare("INSERT OR IGNORE INTO community_follows(owner_id,target_owner_id,created_at) VALUES(?,?,?)").bind(ownerId,target.owner_id,Date.now()).run();
    const following=!!await this.db.prepare("SELECT 1 FROM community_follows WHERE owner_id=? AND target_owner_id=?").bind(ownerId,target.owner_id).first();
    const count=await this.db.prepare("SELECT COUNT(*) AS n FROM community_follows WHERE target_owner_id=?").bind(target.owner_id).first<Row>();
    return { following, followers:Number(count?.n||0) };
  }
  async followState(ownerId: string, handle: string) {
    const profile = await this.getProfile(handle);
    if (!profile) throw new CommunityError("Creator not found.",404);
    const following = !!await this.db.prepare("SELECT 1 FROM community_follows f JOIN community_profiles p ON p.owner_id=f.target_owner_id WHERE f.owner_id=? AND p.handle=?").bind(ownerId,handle).first();
    return { following, followers: profile.followerCount };
  }
  async reportPost(ownerId: string,id: string,value: unknown) {
    const reason=communityText(value,"Report reason",10,1000);
    await this.requireProfile(ownerId); await this.requirePublished(id); await this.rateLimit(ownerId,"report",10,86400_000);
    await this.db.prepare("INSERT OR IGNORE INTO community_reports(id,owner_id,post_id,reason,created_at) VALUES(?,?,?,?,?)").bind(randomUUID(),ownerId,id,reason,Date.now()).run();
    return { reported:true };
  }
  async moderationQueue() {
    const posts=await this.db.prepare(`${postSelect} WHERE p.status='pending' ORDER BY p.created_at LIMIT 100`).all<Row>();
    const reports=await this.db.prepare(`SELECT r.id,r.post_id,r.reason,r.created_at,a.handle AS reporter_handle FROM community_reports r JOIN community_profiles a ON a.owner_id=r.owner_id JOIN community_posts p ON p.id=r.post_id WHERE p.status='published' ORDER BY r.created_at DESC LIMIT 100`).all<Row>();
    return { posts:(posts.results||[]).map(post),reports:reports.results||[] };
  }
  async moderatePost(id: string,action: "approve"|"reject"|"hide",value = "", expectedUpdatedAt?: number) {
    communityId(id);
    if(!["approve","reject","hide"].includes(action)) throw new CommunityError("Choose approve, reject or hide.");
    const note=communityText(value,"Moderation note",0,500);
    const row=await this.db.prepare("SELECT status,updated_at FROM community_posts WHERE id=?").bind(id).first<Row>();
    if(!row) throw new CommunityError("Showcase not found.",404);
    if(action==="approve"&&row.status!=="pending") throw new CommunityError("Only pending showcases can be approved.",409);
    if(action==="approve"&&expectedUpdatedAt!==undefined&&expectedUpdatedAt!==Number(row.updated_at)) throw new CommunityError("The showcase changed since review. Refresh it before approving.",409);
    const status=action==="approve"?"published":action==="reject"?"rejected":"hidden";
    const result=await this.db.prepare("UPDATE community_posts SET status=?,moderation_note=?,updated_at=MAX(?,updated_at+1),published_at=CASE WHEN ?='published' THEN COALESCE(published_at,?) ELSE published_at END WHERE id=? AND status=? AND updated_at=?")
      .bind(status,note,Date.now(),status,Date.now(),id,row.status,row.updated_at).run();
    if(!result.meta.changes) throw new CommunityError("The showcase changed during moderation. Refresh and try again.",409);
    return { moderated:true,status };
  }
}
export async function communityDatabase(): Promise<CommunityDatabase> {
  const env=await billingEnv();
  if(!env.BILLING_DB) throw new CommunityError("Community storage is unavailable.",503);
  return new CommunityDatabase(env.BILLING_DB);
}
