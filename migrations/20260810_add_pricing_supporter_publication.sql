-- New applications snapshot the active price rules. Existing records remain unchanged.
ALTER TABLE applications ADD COLUMN pricing_version TEXT;
ALTER TABLE applications ADD COLUMN pricing_effective_at TEXT;
ALTER TABLE applications ADD COLUMN donation_equivalent_jpy INTEGER;
ALTER TABLE applications ADD COLUMN supporter_publication_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE applications ADD COLUMN supporter_publication_name TEXT;
ALTER TABLE applications ADD COLUMN supporter_include_maiden_name INTEGER NOT NULL DEFAULT 0;
ALTER TABLE applications ADD COLUMN supporter_joint_name TEXT;
ALTER TABLE applications ADD COLUMN supporter_anonymous INTEGER NOT NULL DEFAULT 1;
ALTER TABLE applications ADD COLUMN supporter_badge_preference TEXT;
ALTER TABLE applications ADD COLUMN supporter_message TEXT;

ALTER TABLE bank_transfer_previews ADD COLUMN pricing_version TEXT;
ALTER TABLE bank_transfer_previews ADD COLUMN pricing_effective_at TEXT;
ALTER TABLE bank_transfer_previews ADD COLUMN donation_equivalent_jpy INTEGER;

CREATE INDEX IF NOT EXISTS idx_applications_public_festa60_summary
  ON applications (payment_status, status, cancelled_at, refunded_at, paid_at);
