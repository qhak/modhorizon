ALTER TABLE billing_accounts ADD COLUMN social_reward_credits INTEGER NOT NULL DEFAULT 0 CHECK (social_reward_credits >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN social_reward_reserved INTEGER NOT NULL DEFAULT 0 CHECK (social_reward_reserved >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN social_reward_charged INTEGER NOT NULL DEFAULT 0 CHECK (social_reward_charged >= 0 AND social_reward_charged <= social_reward_reserved);

CREATE TABLE social_reward_claims (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('approved','rejected')),
  credits_remaining INTEGER NOT NULL DEFAULT 0 CHECK (credits_remaining >= 0),
  review_note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (state='approved' OR credits_remaining=0),
  UNIQUE(account_id,campaign_id)
);
CREATE INDEX social_reward_claims_expiry ON social_reward_claims(account_id,state,expires_at);

CREATE TABLE generation_credit_reservation_social_rewards (
  reservation_id TEXT NOT NULL REFERENCES generation_credit_reservations(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES social_reward_claims(id) ON DELETE CASCADE,
  credits_reserved INTEGER NOT NULL CHECK (credits_reserved > 0),
  PRIMARY KEY (reservation_id,claim_id)
);

CREATE TRIGGER social_reward_claim_balance_insert
AFTER INSERT ON social_reward_claims
WHEN NEW.credits_remaining > 0
BEGIN
  UPDATE billing_accounts
  SET social_reward_credits=social_reward_credits+NEW.credits_remaining,
      credit_balance=credit_balance+NEW.credits_remaining,
      updated_at=NEW.updated_at
  WHERE id=NEW.account_id;
END;

CREATE TRIGGER social_reward_claim_balance_update
AFTER UPDATE OF credits_remaining ON social_reward_claims
WHEN NEW.credits_remaining <> OLD.credits_remaining
BEGIN
  UPDATE billing_accounts
  SET social_reward_credits=social_reward_credits+NEW.credits_remaining-OLD.credits_remaining,
      credit_balance=credit_balance+NEW.credits_remaining-OLD.credits_remaining,
      updated_at=NEW.updated_at
  WHERE id=NEW.account_id;
END;

CREATE TRIGGER social_reward_claim_balance_delete
AFTER DELETE ON social_reward_claims
WHEN OLD.credits_remaining > 0
BEGIN
  UPDATE billing_accounts
  SET social_reward_credits=social_reward_credits-OLD.credits_remaining,
      credit_balance=credit_balance-OLD.credits_remaining
  WHERE id=OLD.account_id;
END;
