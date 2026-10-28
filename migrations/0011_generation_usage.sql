ALTER TABLE generation_credit_reservations ADD COLUMN generation_id TEXT;
ALTER TABLE generation_credit_reservations ADD COLUMN call_kind TEXT CHECK (call_kind IN ('generation','repair'));
ALTER TABLE generation_credit_reservations ADD COLUMN input_tokens INTEGER CHECK (input_tokens >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN output_tokens INTEGER CHECK (output_tokens >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN usage_source TEXT CHECK (usage_source IN ('reported','estimated'));
ALTER TABLE generation_credit_reservations ADD COLUMN input_rate REAL CHECK (input_rate >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN output_rate REAL CHECK (output_rate >= 0);
ALTER TABLE generation_credit_reservations ADD COLUMN provider_request_id TEXT;
CREATE INDEX generation_reservations_generation ON generation_credit_reservations(account_id,generation_id);
