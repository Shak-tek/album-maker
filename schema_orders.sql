BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  album_size TEXT,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PKR',
  images_count INTEGER,
  pages_count INTEGER,
  city TEXT,
  order_date DATE NOT NULL,
  production_started_at TIMESTAMPTZ,
  production_completed_at TIMESTAMPTZ,
  payment_date TIMESTAMPTZ,
  payment_method TEXT,
  payment_status TEXT,
  payment_transaction_id TEXT,
  referral_source TEXT,
  device_info TEXT,
  occasion TEXT,
  occasion_date DATE,
  gift_recipient_name TEXT,
  gift_recipient_relationship TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_order_number_key UNIQUE (order_number)
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_order_date_idx ON orders (order_date DESC);

CREATE OR REPLACE FUNCTION set_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_set_updated_at ON orders;

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_orders_updated_at();

COMMIT;
