ALTER TABLE billing_accounts ADD COLUMN allowance_credits INTEGER NOT NULL DEFAULT 0 CHECK (allowance_credits >= 0);
ALTER TABLE billing_accounts ADD COLUMN purchased_credits INTEGER NOT NULL DEFAULT 0 CHECK (purchased_credits >= 0);
ALTER TABLE billing_accounts ADD COLUMN allowance_period INTEGER NOT NULL DEFAULT 0;
-- Preserve any unspent historical top-ups; historical consumption did not identify buckets.
UPDATE billing_accounts SET purchased_credits=MIN(credit_balance,COALESCE((SELECT SUM(delta) FROM credit_ledger WHERE account_id=billing_accounts.id AND reason='manual_credit_pack'),0));
UPDATE billing_accounts SET allowance_credits=credit_balance-purchased_credits;
ALTER TABLE generation_credit_reservations ADD COLUMN allowance_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE generation_credit_reservations ADD COLUMN purchased_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE generation_credit_reservations ADD COLUMN allowance_period INTEGER NOT NULL DEFAULT 0;
UPDATE generation_credit_reservations SET allowance_reserved=reserved_credits;
-- Different Stripe events for the same checkout must never deliver credits twice.
CREATE TABLE credit_purchases (
  checkout_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(id),
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  stripe_event_id TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

ALTER TABLE billing_accounts ADD COLUMN last_invoice_period_start INTEGER NOT NULL DEFAULT 0;
CREATE TABLE subscription_credit_invoices (invoice_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE subscription_checkout_grants (checkout_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
