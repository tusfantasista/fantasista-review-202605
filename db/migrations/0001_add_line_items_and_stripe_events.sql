ALTER TABLE applications ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE applications ADD COLUMN total_amount_jpy INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN stripe_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_event_id ON payments (stripe_event_id) WHERE stripe_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_line_items (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  payment_id TEXT,
  item_type TEXT NOT NULL CHECK (item_type IN ('ticket', 'companion', 'donation', 'sponsorship', 'discount')),
  label TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_amount_jpy INTEGER NOT NULL DEFAULT 0,
  amount_jpy INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_line_items_application_id ON payment_line_items (application_id);
CREATE INDEX IF NOT EXISTS idx_payment_line_items_payment_id ON payment_line_items (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_line_items_item_type ON payment_line_items (item_type);

CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
