-- Opt-in public community data; never copies private project snapshots or auth emails.
CREATE TABLE IF NOT EXISTS community_profiles (
  owner_id TEXT PRIMARY KEY, handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id),
  slug TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, description TEXT NOT NULL,
  instructions TEXT NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL, version TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]', cover_image TEXT NOT NULL DEFAULT '', download_url TEXT NOT NULL DEFAULT '', testing TEXT NOT NULL DEFAULT 'untested',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','published','rejected','hidden')),
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, published_at INTEGER,
  moderation_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS community_posts_public ON community_posts(status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS community_posts_owner ON community_posts(owner_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS community_likes (
  owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id), post_id TEXT NOT NULL REFERENCES community_posts(id),
  created_at INTEGER NOT NULL, PRIMARY KEY(owner_id, post_id)
);
CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id), post_id TEXT NOT NULL REFERENCES community_posts(id),
  text TEXT NOT NULL, created_at INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS community_comments_post ON community_comments(post_id, hidden, created_at);
CREATE TABLE IF NOT EXISTS community_follows (
  owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id), target_owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id),
  created_at INTEGER NOT NULL, PRIMARY KEY(owner_id,target_owner_id), CHECK(owner_id != target_owner_id)
);
CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id), post_id TEXT NOT NULL REFERENCES community_posts(id),
  reason TEXT NOT NULL, created_at INTEGER NOT NULL, UNIQUE(owner_id,post_id)
);
CREATE TABLE IF NOT EXISTS community_activity (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, action TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS community_activity_limits ON community_activity(owner_id,action,created_at);
CREATE TABLE IF NOT EXISTS community_media (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, content_type TEXT NOT NULL, data_base64 TEXT NOT NULL, created_at INTEGER NOT NULL
);
