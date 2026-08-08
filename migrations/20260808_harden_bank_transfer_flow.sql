CREATE TABLE IF NOT EXISTS bank_transfer_previews (
  id TEXT PRIMARY KEY,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  amount_total_jpy INTEGER NOT NULL,
  amount_received_jpy INTEGER NOT NULL DEFAULT 0,
  amount_remaining_jpy INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'jpy',
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'previewed',
  application_id TEXT,
  applicant_email TEXT NOT NULL,
  applicant_name TEXT,
  hosted_instructions_url TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_transfer_previews_customer
  ON bank_transfer_previews (stripe_customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bank_transfer_previews_status
  ON bank_transfer_previews (status, expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_unique
  ON payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

ALTER TABLE payments ADD COLUMN instructions_email_sent_at TEXT;
ALTER TABLE payments ADD COLUMN payment_confirmed_email_sent_at TEXT;
ALTER TABLE payments ADD COLUMN unreconciled_amount_jpy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN cash_balance_attention_at TEXT;
ALTER TABLE payments ADD COLUMN cash_balance_alert_email_sent_at TEXT;

ALTER TABLE applications ADD COLUMN client_submission_id TEXT;
ALTER TABLE applications ADD COLUMN application_received_email_sent_at TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_client_submission_unique
  ON applications (client_submission_id)
  WHERE client_submission_id IS NOT NULL;
