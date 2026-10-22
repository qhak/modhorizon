CREATE TABLE generation_credit_reservations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  model_id TEXT NOT NULL,
  reserved_credits INTEGER NOT NULL CHECK (reserved_credits > 0),
  charged_credits INTEGER NOT NULL DEFAULT 0 CHECK (charged_credits >= 0 AND charged_credits <= reserved_credits),
  state TEXT NOT NULL DEFAULT 'held' CHECK (state IN ('held', 'settled', 'refunded')),
  created_at INTEGER NOT NULL,
  completed_at INTEGER
);
CREATE INDEX generation_reservations_account_state
  ON generation_credit_reservations(account_id, state, created_at);

ALTER TABLE credit_ledger ADD COLUMN reservation_id TEXT REFERENCES generation_credit_reservations(id);
CREATE UNIQUE INDEX credit_ledger_reservation_reason ON credit_ledger(reservation_id, reason);
