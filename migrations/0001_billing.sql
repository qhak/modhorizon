CREATE TABLE IF NOT EXISTS billing_accounts (
  id TEXT PRIMARY KEY,
  plan_key TEXT NOT NULL DEFAULT 'free' CHECK (plan_key IN ('free', 'starter', 'pro', 'studio')),
  credit_balance INTEGER NOT NULL DEFAULT 0 CHECK (credit_balance >= 0),
  free_week_start INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive',
  current_period_end INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS billing_sessions_account ON billing_sessions(account_id);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES billing_accounts(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  model_id TEXT,
  stripe_event_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS credit_ledger_account_date ON credit_ledger(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
