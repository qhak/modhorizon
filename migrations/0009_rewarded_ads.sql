ALTER TABLE billing_accounts ADD COLUMN rewarded_ad_credits INTEGER NOT NULL DEFAULT 0 CHECK (rewarded_ad_credits >= 0);

ALTER TABLE generation_credit_reservations ADD COLUMN rewarded_ad_reserved INTEGER NOT NULL DEFAULT 0 CHECK (rewarded_ad_reserved >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN rewarded_ad_charged INTEGER NOT NULL DEFAULT 0 CHECK (rewarded_ad_charged >= 0 AND rewarded_ad_charged <= rewarded_ad_reserved);
ALTER TABLE generation_credit_reservations ADD COLUMN settlement_effects_applied INTEGER NOT NULL DEFAULT 0 CHECK (settlement_effects_applied IN (0,1));
UPDATE generation_credit_reservations SET settlement_effects_applied=1 WHERE state<>'held';

CREATE TABLE rewarded_ad_claims (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  day_key TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending','granted','cancelled')),
  credits_remaining INTEGER NOT NULL DEFAULT 0 CHECK (credits_remaining IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  granted_at INTEGER,
  CHECK (state='granted' OR credits_remaining=0)
);
CREATE INDEX rewarded_ad_claims_daily_cap ON rewarded_ad_claims(account_id,day_key,state);
CREATE INDEX rewarded_ad_claims_expiry ON rewarded_ad_claims(account_id,state,expires_at);

CREATE TABLE generation_credit_reservation_ad_rewards (
  reservation_id TEXT NOT NULL REFERENCES generation_credit_reservations(id) ON DELETE CASCADE,
  claim_id TEXT NOT NULL REFERENCES rewarded_ad_claims(id) ON DELETE CASCADE,
  credits_reserved INTEGER NOT NULL CHECK (credits_reserved > 0),
  PRIMARY KEY (reservation_id,claim_id)
);

CREATE TRIGGER rewarded_ad_claim_balance_insert
AFTER INSERT ON rewarded_ad_claims
WHEN NEW.credits_remaining > 0
BEGIN
  UPDATE billing_accounts
  SET rewarded_ad_credits=rewarded_ad_credits+NEW.credits_remaining,
      credit_balance=credit_balance+NEW.credits_remaining,
      updated_at=NEW.updated_at
  WHERE id=NEW.account_id;
END;

CREATE TRIGGER rewarded_ad_claim_balance_update
AFTER UPDATE OF credits_remaining ON rewarded_ad_claims
WHEN NEW.credits_remaining <> OLD.credits_remaining
BEGIN
  UPDATE billing_accounts
  SET rewarded_ad_credits=rewarded_ad_credits+NEW.credits_remaining-OLD.credits_remaining,
      credit_balance=credit_balance+NEW.credits_remaining-OLD.credits_remaining,
      updated_at=NEW.updated_at
  WHERE id=NEW.account_id;
END;

CREATE TRIGGER rewarded_ad_claim_balance_delete
AFTER DELETE ON rewarded_ad_claims
WHEN OLD.credits_remaining > 0
BEGIN
  UPDATE billing_accounts
  SET rewarded_ad_credits=rewarded_ad_credits-OLD.credits_remaining,
      credit_balance=credit_balance-OLD.credits_remaining
  WHERE id=OLD.account_id;
END;
