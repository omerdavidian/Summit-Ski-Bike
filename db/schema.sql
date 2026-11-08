CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY,
  reference text NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  season text NOT NULL CHECK (season IN ('winter','summer')),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  interests jsonb NOT NULL DEFAULT '[]',
  message text NOT NULL,
  owner_email_id text,
  client_email_id text,
  delivery_lock_until timestamptz,
  legacy_id text UNIQUE,
  imported_at timestamptz
);
CREATE TABLE IF NOT EXISTS form_limits (
  bucket text PRIMARY KEY,
  used integer NOT NULL DEFAULT 0,
  window_started timestamptz NOT NULL DEFAULT NOW()
);
-- Periodically remove expired rate-limit keys; inquiries are retained separately.
-- DELETE FROM form_limits WHERE window_started < NOW() - INTERVAL '7 days';
