-- Cloudflare D1 identity mapping; credentials remain in managed Supabase Auth.
ALTER TABLE billing_accounts ADD COLUMN auth_subject TEXT;
ALTER TABLE billing_accounts ADD COLUMN auth_email TEXT;
CREATE UNIQUE INDEX billing_accounts_auth_subject_unique ON billing_accounts(auth_subject) WHERE auth_subject IS NOT NULL;
