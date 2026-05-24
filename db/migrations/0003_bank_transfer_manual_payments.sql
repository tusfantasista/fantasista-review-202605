CREATE TABLE IF NOT EXISTS application_sequences (
  name TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO application_sequences (name, last_value)
VALUES ('festa60', 0);

UPDATE application_sequences
SET
  last_value = max(
    last_value,
    (
      SELECT COALESCE(MAX(CAST(SUBSTR(application_code, 7) AS INTEGER)), 0)
      FROM applications
      WHERE application_code GLOB 'FESTA-[0-9][0-9][0-9][0-9][0-9][0-9]'
    )
  ),
  updated_at = datetime('now')
WHERE name = 'festa60';

ALTER TABLE applications ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE applications ADD COLUMN payment_provider TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE applications ADD COLUMN external_payment_id TEXT;
ALTER TABLE applications ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE applications ADD COLUMN expected_transfer_name TEXT;
ALTER TABLE applications ADD COLUMN actual_transfer_name TEXT;
ALTER TABLE applications ADD COLUMN paid_at TEXT;
ALTER TABLE applications ADD COLUMN cancelled_at TEXT;
ALTER TABLE applications ADD COLUMN refunded_at TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_payment_method ON applications (payment_method, payment_provider);

ALTER TABLE payments ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE payments ADD COLUMN payment_provider TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN external_payment_id TEXT;
ALTER TABLE payments ADD COLUMN actual_transfer_name TEXT;
ALTER TABLE payments ADD COLUMN cancelled_at TEXT;
ALTER TABLE payments ADD COLUMN refunded_at TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_method_provider ON payments (payment_method, payment_provider);

UPDATE applications
SET
  quantity = 1 + COALESCE(companion_count, 0),
  payment_method = 'bank_transfer',
  payment_provider = 'manual',
  status = CASE
    WHEN payment_status = 'paid' OR total_amount_jpy = 0 THEN 'confirmed'
    WHEN payment_status = 'cancelled' THEN 'cancelled'
    WHEN payment_status = 'refunded' THEN 'refunded'
    ELSE 'pending'
  END,
  payment_status = CASE
    WHEN payment_status IN ('paid', 'cancelled', 'refunded') THEN payment_status
    WHEN total_amount_jpy = 0 THEN 'paid'
    ELSE 'unpaid'
  END,
  paid_at = CASE
    WHEN total_amount_jpy = 0 AND paid_at IS NULL THEN updated_at
    ELSE paid_at
  END,
  updated_at = datetime('now');
