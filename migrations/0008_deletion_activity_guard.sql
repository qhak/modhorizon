CREATE TRIGGER community_activity_deletion BEFORE INSERT ON community_activity
WHEN EXISTS(SELECT 1 FROM account_deletions WHERE owner_id=NEW.owner_id)
BEGIN SELECT RAISE(ABORT,'Account deletion in progress'); END;
