-- Review-only, per-account device observations. No browser can access D1 directly.
CREATE TABLE IF NOT EXISTS device_risk_observations (
  account_id TEXT NOT NULL,
  device_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  protected_signals TEXT NOT NULL,
  PRIMARY KEY (account_id, device_key)
);
CREATE INDEX IF NOT EXISTS device_risk_observations_created ON device_risk_observations(created_at);
