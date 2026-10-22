ALTER TABLE billing_accounts ADD COLUMN cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK(cancel_at_period_end IN (0,1));
