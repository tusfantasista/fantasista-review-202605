ALTER TABLE payments ADD COLUMN amount_received_jpy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN amount_remaining_jpy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN partial_payment_at TEXT;
ALTER TABLE payments ADD COLUMN partial_payment_email_sent_at TEXT;
