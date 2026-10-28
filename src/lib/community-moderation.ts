import { randomUUID } from "node:crypto";
import { CommunityError, communityId, communityText } from "./community";
import type { CommunityDatabase } from "./community-db";

export type ContentKind = "comment" | "profile";
function target(kind: ContentKind, id: unknown): string {
  if (kind === "comment") return communityId(id);
  if (typeof id !== "string" || !/^[a-z][a-z0-9_]{2,23}$/.test(id)) throw new CommunityError("Invalid creator handle.");
  return id;
}
export async function reportCommunityContent(db: CommunityDatabase, ownerId: string, kind: ContentKind, id: unknown, value: unknown) {
  const targetId = target(kind,id), reason = communityText(value,"Report reason",10,1000);
  await db.requireProfile(ownerId);
  if (kind === "profile") { if (!await db.getProfile(targetId)) throw new CommunityError("Creator not found.",404); }
  else {
    const comment = await db.db.prepare(`SELECT c.post_id FROM community_comments c JOIN community_profiles a ON a.owner_id=c.owner_id WHERE c.id=? AND c.hidden=0 AND a.moderation_status='active' AND NOT EXISTS(SELECT 1 FROM account_deletions d WHERE d.owner_id=a.owner_id)`).bind(targetId).first<{post_id:string}>();
    if (!comment) throw new CommunityError("Comment not found.",404);
    await db.requirePublished(comment.post_id);
  }
  await db.rateLimit(ownerId,"report",10,86400_000);
  await db.db.prepare(`INSERT OR IGNORE INTO community_content_reports(id,owner_id,target_kind,target_id,reason,created_at) VALUES(?,?,?,?,?,?)`).bind(randomUUID(),ownerId,kind,targetId,reason,Date.now()).run();
  return { reported:true };
}
export async function contentModerationQueue(db: CommunityDatabase, query = "") {
  const search = query.slice(0,100).replace(/[\\%_]/g,"\\$&"), q = `%${search}%`;
  const [comments,profiles,reports] = await Promise.all([
    db.db.prepare(`SELECT c.id,c.post_id,c.text,c.hidden,c.created_at,a.handle,a.display_name FROM community_comments c JOIN community_profiles a ON a.owner_id=c.owner_id WHERE c.text LIKE ? ESCAPE '\\' OR a.handle LIKE ? ESCAPE '\\' OR c.id LIKE ? ESCAPE '\\' ORDER BY c.created_at DESC LIMIT 100`).bind(q,q,q).all(),
    db.db.prepare(`SELECT handle,display_name,bio,website,moderation_status,updated_at FROM community_profiles WHERE handle LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT 100`).bind(q,q).all(),
    db.db.prepare(`SELECT r.id,r.target_kind,r.target_id,r.reason,r.created_at,a.handle AS reporter_handle FROM community_content_reports r JOIN community_profiles a ON a.owner_id=r.owner_id WHERE r.resolved_at IS NULL ORDER BY r.created_at LIMIT 100`).all(),
  ]);
  return { comments:comments.results || [],profiles:profiles.results || [],reports:reports.results || [] };
}
export async function moderateCommunityContent(db: CommunityDatabase, moderatorId: string, body: Record<string,unknown>) {
  const note = communityText(body.note ?? "","Moderation note",0,500), now=Date.now();
  if (body.action === "dismiss_report") {
    const id=communityId(body.id);
    const result=await db.db.batch([
      db.db.prepare("UPDATE community_content_reports SET resolved_at=?,resolution='dismissed' WHERE id=? AND resolved_at IS NULL").bind(now,id),
      db.db.prepare("INSERT INTO community_moderation_actions(id,moderator_id,target_kind,target_id,action,note,created_at) SELECT ?,?,'report',?,'dismiss',?,? WHERE changes()=1").bind(randomUUID(),moderatorId,id,note,now),
    ]);
    if (!result[0].meta.changes) throw new CommunityError("Report not found or already resolved.",404);
    return { moderated:true };
  }
  if (!["comment","profile"].includes(String(body.kind)) || !["hide","restore"].includes(String(body.action))) throw new CommunityError("Choose a comment/profile and hide or restore.");
  const kind=body.kind as ContentKind, id=target(kind,body.id), hide=body.action === "hide";
  let update;
  if (kind === "comment") update=db.db.prepare("UPDATE community_comments SET hidden=? WHERE id=? AND hidden!=?").bind(hide?1:0,id,hide?1:0);
  else {
    if (!Number.isSafeInteger(body.updatedAt)) throw new CommunityError("Refresh the profile before moderating it.");
    update=db.db.prepare("UPDATE community_profiles SET moderation_status=?,updated_at=MAX(?,updated_at+1) WHERE handle=? AND updated_at=?").bind(hide?"hidden":"active",now,id,body.updatedAt);
  }
  const result=await db.db.batch([
    update,
    db.db.prepare("INSERT INTO community_moderation_actions(id,moderator_id,target_kind,target_id,action,note,created_at) SELECT ?,?,?,?,?,?,? WHERE changes()=1").bind(randomUUID(),moderatorId,kind,id,body.action,note,now),
    db.db.prepare("UPDATE community_content_reports SET resolved_at=?,resolution=? WHERE target_kind=? AND target_id=? AND resolved_at IS NULL AND changes()>0").bind(now,body.action,kind,id),
  ]);
  if (!result[0].meta.changes) throw new CommunityError("Content changed, is already in that state, or is unavailable. Refresh the queue.",409);
  return { moderated:true };
}
