BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure supporting columns exist before seeding
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

DO $$
DECLARE
  default_password CONSTANT TEXT := 'AlbumPass123!';
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
      ('amna.nasir@example.com','Amna Nasir','123 Clifton Road, Karachi','75500','+92 300 1111111','Karachi'),
      ('bilal.ahmed@example.com','Bilal Ahmed','45 Mall Road, Lahore','54000','+92 301 2222222','Lahore'),
      ('danish.raza@example.com','Danish Raza','18 F-7 Markaz, Islamabad','44000','+92 302 3333333','Islamabad'),
      ('hiba.saeed@example.com','Hiba Saeed','22 University Rd, Peshawar','25000','+92 303 4444444','Peshawar'),
      ('zohaib.khan@example.com','Zohaib Khan','9 Shahrah-e-Faisal, Karachi','75350','+92 304 5555555','Karachi')
    ) AS payload(email, name, address, postcode, phone, city)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM users WHERE lower(email) = lower(rec.email)) THEN
      INSERT INTO users (email, password_hash, name, address, postcode, phone_number, role)
      VALUES (
        rec.email,
        crypt(default_password, gen_salt('bf', 12)),
        rec.name,
        rec.address,
        rec.postcode,
        rec.phone,
        'customer'
      );
    ELSE
      UPDATE users
      SET
        password_hash = crypt(default_password, gen_salt('bf', 12)),
        name = rec.name,
        address = rec.address,
        postcode = rec.postcode,
        phone_number = rec.phone,
        role = COALESCE(role, 'customer')
      WHERE lower(email) = lower(rec.email);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT *
    FROM (VALUES
      ('ORD-2001','amna.nasir@example.com','in_printing','large',6000.00::numeric,DATE '2025-09-03',TIMESTAMPTZ '2025-09-01 09:00+00',TIMESTAMPTZ '2025-09-03 17:00+00',TIMESTAMPTZ '2025-09-03 17:05+00','visa','success','TXN-982341','facebook','chrome / android','birthday',DATE '2025-10-10','Zara','sister',48,24,'Karachi'),
      ('ORD-2002','bilal.ahmed@example.com','ready_for_packing','medium',4500.00::numeric,DATE '2025-09-02',TIMESTAMPTZ '2025-08-31 10:00+00',TIMESTAMPTZ '2025-09-02 14:30+00',TIMESTAMPTZ '2025-09-02 14:40+00','mastercard','pending','TXN-982567','instagram','safari / ios','anniversary',DATE '2025-09-22','Hira','wife',36,20,'Lahore'),
      ('ORD-2003','danish.raza@example.com','ready_for_delivery','large',5200.00::numeric,DATE '2025-09-01',TIMESTAMPTZ '2025-08-29 08:30+00',TIMESTAMPTZ '2025-09-01 18:10+00',TIMESTAMPTZ '2025-09-01 18:15+00','visa','success','TXN-982842','google ads','edge / windows','new baby',DATE '2025-10-01','Noor','daughter',40,24,'Islamabad'),
      ('ORD-2004','hiba.saeed@example.com','delivered','small',3800.00::numeric,DATE '2025-08-28',TIMESTAMPTZ '2025-08-26 09:15+00',TIMESTAMPTZ '2025-08-28 12:45+00',TIMESTAMPTZ '2025-08-28 12:50+00','cash','success','TXN-982990','word of mouth','chrome / android','graduation',DATE '2025-09-15','Aimen','friend',28,16,'Peshawar'),
      ('ORD-2005','zohaib.khan@example.com','abandoned','medium',0.00::numeric,DATE '2025-08-25',NULL::timestamptz,NULL::timestamptz,NULL::timestamptz,NULL::text,'failed',NULL::text,'facebook ads','firefox / android','wedding',DATE '2025-10-20','Sara','fiance',20,12,'Karachi'),
      ('ORD-2006','amna.nasir@example.com','in_printing','large',6100.00::numeric,DATE '2025-09-05',TIMESTAMPTZ '2025-09-03 11:00+00',NULL::timestamptz,TIMESTAMPTZ '2025-09-05 10:10+00','visa','success','TXN-983120','email','chrome / android','birthday',DATE '2025-11-02','Rehan','brother',52,28,'Karachi')
    ) AS payload(
      order_number,
      email,
      status,
      album_size,
      amount_paid,
      order_date,
      production_started_at,
      production_completed_at,
      payment_date,
      payment_method,
      payment_status,
      transaction_id,
      referral_source,
      device_info,
      occasion,
      occasion_date,
      gift_name,
      gift_relationship,
      images_count,
      pages_count,
      city
    )
  LOOP
    INSERT INTO orders (
      order_number,
      user_id,
      status,
      album_size,
      amount_paid,
      currency,
      images_count,
      pages_count,
      city,
      order_date,
      production_started_at,
      production_completed_at,
      payment_date,
      payment_method,
      payment_status,
      payment_transaction_id,
      referral_source,
      device_info,
      occasion,
      occasion_date,
      gift_recipient_name,
      gift_recipient_relationship
    )
    SELECT
      rec.order_number,
      u.id,
      rec.status,
      rec.album_size,
      rec.amount_paid,
      'PKR',
      rec.images_count,
      rec.pages_count,
      rec.city,
      rec.order_date,
      rec.production_started_at,
      rec.production_completed_at,
      rec.payment_date,
      rec.payment_method,
      rec.payment_status,
      rec.transaction_id,
      rec.referral_source,
      rec.device_info,
      rec.occasion,
      rec.occasion_date,
      rec.gift_name,
      rec.gift_relationship
    FROM users u
    WHERE lower(u.email) = lower(rec.email)
    ON CONFLICT (order_number) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      status = EXCLUDED.status,
      album_size = EXCLUDED.album_size,
      amount_paid = EXCLUDED.amount_paid,
      images_count = EXCLUDED.images_count,
      pages_count = EXCLUDED.pages_count,
      city = EXCLUDED.city,
      order_date = EXCLUDED.order_date,
      production_started_at = EXCLUDED.production_started_at,
      production_completed_at = EXCLUDED.production_completed_at,
      payment_date = EXCLUDED.payment_date,
      payment_method = EXCLUDED.payment_method,
      payment_status = EXCLUDED.payment_status,
      payment_transaction_id = EXCLUDED.payment_transaction_id,
      referral_source = EXCLUDED.referral_source,
      device_info = EXCLUDED.device_info,
      occasion = EXCLUDED.occasion,
      occasion_date = EXCLUDED.occasion_date,
      gift_recipient_name = EXCLUDED.gift_recipient_name,
      gift_recipient_relationship = EXCLUDED.gift_recipient_relationship;
  END LOOP;
END $$;

COMMIT;
