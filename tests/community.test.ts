import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database, D1Result, D1Statement } from "../src/lib/billing-db";
import { CommunityDatabase } from "../src/lib/community-db";

import { requireCommunityOrigin, communityModeratorAllowed, communityBody } from "../src/lib/community-access";
import { validateCommunityImage, storeCommunityImage, readCommunityImage } from "../src/lib/community-media";
import { safeStructuredData, trustedCommunityOrigin } from "../src/lib/community-seo";
import { communityId, validateCommunityPost, validateCommunityProfile } from "../src/lib/community";

class Statement implements D1Statement {
  constructor(private sqlite: DatabaseSync, private query: string, private values: SQLInputValue[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.sqlite, this.query, values as SQLInputValue[]); }
  async first<T>(column?: string): Promise<T | null> {
    const row = this.sqlite.prepare(this.query).get(...this.values);
    return (column ? row?.[column] : row) as T ?? null;
  }
  async all<T>(): Promise<D1Result<T>> { return { results: this.sqlite.prepare(this.query).all(...this.values) as T[], meta: { changes: 0 } }; }
  execute<T>(): D1Result<T> {
    const stmt = this.sqlite.prepare(this.query);
    if (stmt.columns().length) {
      const rows = stmt.all(...this.values) as T[];
      const changes = /^\s*SELECT\b/i.test(this.query) ? 0 : Number(this.sqlite.prepare("SELECT changes() AS n").get()!.n);
      return { results: rows, meta: { changes } };
    }
    return { meta: { changes: Number(stmt.run(...this.values).changes) } };
  }
  async run<T>() { return this.execute<T>(); }
}
function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  sqlite.exec(readFileSync(new URL("../migrations/0006_community.sql", import.meta.url), "utf8"));
  const d1: D1Database = {
    prepare: query => new Statement(sqlite, query),
    async batch<T>(statements: D1Statement[]): Promise<D1Result<T>[]> {
      sqlite.exec("BEGIN IMMEDIATE");
      try { const results = statements.map(s => (s as Statement).execute<T>()); sqlite.exec("COMMIT"); return results; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return { db: new CommunityDatabase(d1), sqlite };
}
const profile = (handle: string) => ({ handle, displayName: handle === "alice" ? "Alice" : "Bob", bio: "I build Minecraft plugins.", website: "" });
const input = (title = "Launch feather plugin", submitForReview = false) => ({
  title, summary: "A feather that launches players upward with a five-second cooldown.",
  description: "Right-click the special feather to launch upward. Cloud particles trail the player and a five-second cooldown prevents repeated activation. This is a creator-tested Paper plugin, not a client mod.",
  instructions: "Install the JAR in a private Paper server's plugins folder and restart.",
  kind: "plugin" as const, target: "paper", version: "1.21.4", tags: ["movement", "particles"], coverImage: "", testing: "creator-tested" as const, submitForReview,
});
async function owners(db: CommunityDatabase) {
  await db.setProfile("owner-alice-private", profile("alice"));
  await db.setProfile("owner-bob-private", profile("bobby"));
}

test("community drafts and review submissions are private until explicitly approved", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    const draft = await db.savePost("owner-alice-private", input());
    assert.equal(draft.status, "draft");
    assert.equal(await db.getPost(draft.id), null);
    assert.equal(await db.getPost(draft.id, "owner-bob-private"), null);
    assert.equal((await db.getPost(draft.id, "owner-alice-private"))?.id, draft.id);
    assert.equal((await db.listPosts()).posts.length, 0);
    const pending = await db.savePost("owner-alice-private", input("Launch feather plugin", true), draft.id);
    assert.equal(pending.status, "pending");
    assert.equal((await db.listPosts()).posts.length, 0);
    await db.moderatePost(draft.id, "approve");
    const publicPost = await db.getPost(draft.id);
    assert.equal(publicPost?.status, "published");
    assert.equal((await db.listPosts()).posts[0].id, draft.id);
    assert.equal((await db.sitemapPosts()).length, 1);
  } finally { sqlite.close(); }
});

test("showcase updates and withdrawals enforce the authenticated owner", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    const created = await db.savePost("owner-alice-private", input("Original showcase", true));
    await db.moderatePost(created.id, "approve");
    await assert.rejects(db.savePost("owner-bob-private", input("Stolen showcase", true), created.id));
    await assert.rejects(db.withdrawPost("owner-bob-private", created.id));
    assert.equal((await db.getPost(created.id))?.title, "Original showcase");
    const revised = await db.savePost("owner-alice-private", input("Revised showcase", true), created.id);
    assert.equal(revised.id, created.id);
    assert.equal(revised.status, "pending", "editing approved content cannot bypass review");
    assert.equal(await db.getPost(created.id), null);
    await db.moderatePost(created.id, "approve");
    await db.withdrawPost("owner-alice-private", created.id);
    assert.equal(await db.getPost(created.id), null);
    assert.equal((await db.listPosts()).posts.length, 0);
    assert.equal((await db.sitemapPosts()).length, 0);
  } finally { sqlite.close(); }
});

test("public profiles and showcases disclose no internal owners, prompts, source or billing data", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    const created = await db.savePost("owner-alice-private", { ...input("Public fields only", true),
      ownerId: "owner-bob-private", status: "published", source: "private-api-key", prompt: "private prompt", logs: ["private logs"], email: "secret@example.test" });
    assert.equal(created.status, "pending");
    await db.moderatePost(created.id, "approve");
    const dto = JSON.stringify({ profile: await db.getProfile("alice"), post: await db.getPost(created.id), list: await db.listPosts() });
    assert.doesNotMatch(dto, /owner-alice-private|owner-bob-private|private-api-key|private prompt|private logs|secret@example|owner_id|auth_subject|credit_balance/);
    assert.equal((await db.getProfile("alice"))?.showcaseCount, 1);
    await db.withdrawPost("owner-alice-private", created.id);
    assert.equal((await db.getProfile("alice"))?.showcaseCount, 0);
  } finally { sqlite.close(); }
});

test("likes, follows and comments are real interactions and disappear from public hidden showcases", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    const created = await db.savePost("owner-alice-private", input("Community interaction", true));
    await assert.rejects(db.toggleLike("owner-bob-private", created.id));
    await assert.rejects(db.addComment("owner-bob-private", created.id, "Not public yet"));
    await db.moderatePost(created.id, "approve");
    await db.toggleLike("owner-bob-private", created.id);
    assert.equal((await db.getPost(created.id))?.likes, 1);
    await db.toggleLike("owner-bob-private", created.id);
    assert.equal((await db.getPost(created.id))?.likes, 0);
    await db.toggleFollow("owner-bob-private", "alice");
    assert.equal((await db.getProfile("alice"))?.followerCount, 1);
    await db.toggleFollow("owner-bob-private", "alice");
    assert.equal((await db.getProfile("alice"))?.followerCount, 0);
    await assert.rejects(db.toggleFollow("owner-alice-private", "alice"));
    const text = "<script>alert('plain text')</script>";
    await db.addComment("owner-bob-private", created.id, text);
    const comments = await db.listComments(created.id);
    assert.equal(comments.length, 1);
    assert.equal(comments[0].text, text, "untrusted text remains text; the UI must escape it");
    assert.doesNotMatch(JSON.stringify(comments), /owner-bob-private|owner_id|email/);
    await db.moderatePost(created.id, "hide");
    assert.equal(await db.getPost(created.id), null);
    await assert.rejects(db.listComments(created.id), /not found/i);
    await assert.rejects(db.addComment("owner-bob-private", created.id, "Hidden post"));
  } finally { sqlite.close(); }
});

test("search and pagination stay bounded and cannot expose private rows", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    const visible = await db.savePost("owner-alice-private", input("Find this feather", true));
    await db.moderatePost(visible.id, "approve");
    await db.savePost("owner-alice-private", input("Private feather draft"));
    assert.equal((await db.listPosts({ q: "feather" })).posts.length, 1);
    assert.equal((await db.listPosts({ q: "' OR 1=1 --" })).posts.length, 0);
    assert.equal((await db.listPosts({ author: "alice" })).posts.length, 1);
    await assert.rejects(db.listPosts({ cursor: "not-a-valid-cursor" }));
    assert.equal((await db.listPosts({ kind: "not_a_kind" })).posts.length, 0);
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS n FROM community_posts").get()!.n), 2);
  } finally { sqlite.close(); }
});

test("profile handles are unique and screenshot IDs cannot be stolen across creators", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    await assert.rejects(db.setProfile("owner-bob-private", profile("alice")));
    const id = "11111111-1111-4111-8111-111111111111";
    sqlite.prepare("INSERT INTO community_media(id,owner_id,content_type,data_base64,created_at) VALUES(?,?,?,?,?)")
      .run(id, "owner-alice-private", "image/png", "iVBORw0KGgo=", Date.now());
    await assert.rejects(db.savePost("owner-bob-private", { ...input(), coverImage: `/api/community/media/${id}` }));
    const own = await db.savePost("owner-alice-private", { ...input(), coverImage: `/api/community/media/${id}` });
    assert.equal(own.coverImage, `/api/community/media/${id}`);
  } finally { sqlite.close(); }
});

test("report uniqueness and per-account write limits do not rely on fake engagement counters", async () => {
  const { db, sqlite } = database();
  try {
    await owners(db);
    const created = await db.savePost("owner-alice-private", input("Reportable showcase", true));
    await db.moderatePost(created.id, "approve");
    await db.reportPost("owner-bob-private", created.id, "This content appears to be a duplicate.");
    try { await db.reportPost("owner-bob-private", created.id, "Repeated report"); } catch { /* Duplicate may be refused or idempotent. */ }
    assert.equal(Number(sqlite.prepare("SELECT COUNT(*) AS n FROM community_reports WHERE post_id=?").get(created.id)!.n), 1);
    let limited = false;
    for (let i = 0; i < 60; i++) {
      try { await db.addComment("owner-bob-private", created.id, `Bounded test comment ${i}`); }
      catch (error) { assert.match(String(error), /limit|wait|many|slow|rate/i); limited = true; break; }
    }
    assert.ok(limited, "a single account cannot write unbounded comments");
  } finally { sqlite.close(); }
});


test("community writes reject absent, cross-site and malformed origins", async () => {
  const request = (headers: Record<string,string>) => new Request("https://example.com/api/community/posts", { method: "POST", headers });
  assert.throws(() => requireCommunityOrigin(request({})));
  assert.throws(() => requireCommunityOrigin(request({ origin: "https://evil.example" })));
  assert.throws(() => requireCommunityOrigin(request({ origin: "https://example.com", "sec-fetch-site": "cross-site" })));
  assert.doesNotThrow(() => requireCommunityOrigin(request({ origin: "https://example.com" })));
  assert.equal(communityModeratorAllowed("alice", undefined), false);
  assert.equal(communityModeratorAllowed("alice", "malice,bob"), false);
  assert.equal(communityModeratorAllowed("alice", "bob, alice"), true);
  await assert.rejects(communityBody(new Request("https://example.com", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({text:"x".repeat(25000)})})));
});

test("validation rejects unsupported download hosts, oversized text and malformed IDs", () => {
  assert.throws(() => communityId("11111111-1111-4111-8111-111111111111\n"));
  assert.throws(() => validateCommunityProfile(profile("name-with-hyphens")));
  assert.throws(() => validateCommunityPost({...input(), downloadUrl:"https://github.com.evil.example/release"}));
  assert.throws(() => validateCommunityPost({...input(), downloadUrl:"javascript:alert(1)"}));
  assert.throws(() => validateCommunityPost({...input(), description:"x".repeat(6001)}));
  assert.equal(validateCommunityPost({...input(), downloadUrl:"https://modrinth.com/plugin/example"}).downloadUrl,"https://modrinth.com/plugin/example");
});

test("screenshot access follows publication, ownership and pending-only moderator review", async () => {
  const {db,sqlite}=database();
  try {
    await owners(db);
    const bytes=readFileSync(new URL("../public/providers/claude_app_icon.png",import.meta.url));
    const data="data:image/png;base64,"+bytes.toString("base64");
    assert.equal(validateCommunityImage(data).contentType,"image/png");
    assert.throws(()=>validateCommunityImage("data:image/svg+xml;base64,PHN2Zz4="));
    assert.throws(()=>validateCommunityImage("https://example.com/cover.png"));
    const media=await storeCommunityImage(db.db,"owner-alice-private",data), id=media.url.split("/").pop()!;
    await assert.rejects(readCommunityImage(db.db,id));
    await assert.rejects(readCommunityImage(db.db,id,"owner-bob-private",true),"moderators cannot browse unattached private uploads");
    assert.equal((await readCommunityImage(db.db,id,"owner-alice-private")).bytes.length,bytes.length);
    const draft=await db.savePost("owner-alice-private",{...input(),coverImage:media.url});
    await assert.rejects(readCommunityImage(db.db,id,"owner-bob-private",true));
    const pending=await db.savePost("owner-alice-private",{...input("Pending screenshot",true),coverImage:media.url},draft.id);
    assert.ok(await readCommunityImage(db.db,id,"owner-bob-private",true));
    await assert.rejects(readCommunityImage(db.db,id,"owner-bob-private"));
    await db.moderatePost(draft.id,"approve","",pending.updatedAt);
    assert.ok(await readCommunityImage(db.db,id));
    await db.withdrawPost("owner-alice-private",draft.id);
    await assert.rejects(readCommunityImage(db.db,id));
    for(let n=0;n<5;n++) await storeCommunityImage(db.db,"owner-alice-private",data);
    await assert.rejects(storeCommunityImage(db.db,"owner-alice-private",data),/limit/i);
  } finally {sqlite.close();}
});

test("approval rejects a stale review and hidden posts cannot be republished by their owner", async () => {
  const {db,sqlite}=database();
  try {
    await owners(db);
    const pending=await db.savePost("owner-alice-private",input("Pending original",true));
    await assert.rejects(db.moderatePost(pending.id,"approve","",pending.updatedAt-1),/changed/i);
    const revised=await db.savePost("owner-alice-private",input("Pending revised",true),pending.id);
    assert.ok(revised.updatedAt > pending.updatedAt,"review revisions advance even within the same millisecond");
    await assert.rejects(db.moderatePost(pending.id,"approve","",pending.updatedAt),/changed/i);
    await db.moderatePost(pending.id,"approve","",revised.updatedAt);
    await db.moderatePost(pending.id,"hide");
    await assert.rejects(db.savePost("owner-alice-private",input("Trying to republish",true),pending.id));
    assert.equal((await db.sitemapPosts()).length,0);
    assert.equal((await db.moderationQueue()).posts.length,0);
  } finally {sqlite.close();}
});

test("SEO escapes script terminators and requires an explicit public HTTPS origin", () => {
  assert.equal(trustedCommunityOrigin("http://127.0.0.1:3215"),null);
  assert.equal(trustedCommunityOrigin("https://localhost"),null);
  assert.equal(trustedCommunityOrigin("https://example.com/path"),null);
  assert.equal(trustedCommunityOrigin("https://example.com"),"https://example.com");
  assert.doesNotMatch(safeStructuredData({name:"</script><script>alert(1)</script>"}),/<script|<\/script/i);
  assert.equal(JSON.parse(safeStructuredData({name:"</script>"})).name,"</script>");
});
