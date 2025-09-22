-- Admin authentication support
BEGIN;

-- Required for crypt() to produce bcrypt hashes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure a role column exists and default all existing users to customer
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

-- Track last successful admin login (optional)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS admin_last_login_at TIMESTAMPTZ;

-- Helpful indexes
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

-- Seed/refresh an admin account (update email & password before running)
INSERT INTO users (email, password_hash, name, role)
SELECT
  'admin@admin.com',
  crypt('1122', gen_salt('bf', 12)),
  'FlipSnip Admin',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE lower(email) = lower('admin@admin.com')
);

UPDATE users
SET
  password_hash = crypt('1122', gen_salt('bf', 12)),
  name = 'FlipSnip Admin',
  role = 'admin'
WHERE lower(email) = lower('admin@admin.com');

COMMIT;
