ALTER TABLE community_profiles ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'active' CHECK(moderation_status IN ('active','hidden'));
CREATE TABLE community_content_reports (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES community_profiles(owner_id),
  target_kind TEXT NOT NULL CHECK(target_kind IN ('comment','profile')), target_id TEXT NOT NULL,
  reason TEXT NOT NULL, created_at INTEGER NOT NULL, resolved_at INTEGER, resolution TEXT
);
CREATE UNIQUE INDEX community_content_reports_open ON community_content_reports(owner_id,target_kind,target_id) WHERE resolved_at IS NULL;
CREATE TABLE community_moderation_actions (
  id TEXT PRIMARY KEY, moderator_id TEXT NOT NULL, target_kind TEXT NOT NULL,
  target_id TEXT NOT NULL, action TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE TABLE account_deletions (
  owner_id TEXT PRIMARY KEY, state TEXT NOT NULL CHECK(state IN ('pending','complete')),
  requested_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
ALTER TABLE billing_accounts ADD COLUMN deletion_requested_at INTEGER;
ALTER TABLE billing_accounts ADD COLUMN deleted_at INTEGER;

-- Gate requests already in flight when deletion starts, not just subsequent logins.
CREATE TRIGGER community_profile_deletion_insert BEFORE INSERT ON community_profiles
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_profile_deletion_update BEFORE UPDATE ON community_profiles
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_post_deletion_insert BEFORE INSERT ON community_posts
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_post_deletion_update BEFORE UPDATE ON community_posts
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_comment_deletion BEFORE INSERT ON community_comments
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_like_deletion BEFORE INSERT ON community_likes
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_follow_deletion BEFORE INSERT ON community_follows
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id IN (NEW.owner_id,NEW.target_owner_id))
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER community_media_deletion BEFORE INSERT ON community_media
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
CREATE TRIGGER billing_session_deletion BEFORE INSERT ON billing_sessions
WHEN EXISTS(SELECT 1 FROM billing_accounts WHERE id=NEW.account_id AND deletion_requested_at IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
