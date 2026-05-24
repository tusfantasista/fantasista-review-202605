PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  member_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  full_name_kana TEXT,
  maiden_name TEXT,
  email TEXT,
  phone TEXT,
  graduation_year INTEGER,
  generation TEXT,
  school_lineage TEXT,
  dance_role TEXT,
  notes TEXT,
  source_batch_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_name ON members (full_name, full_name_kana);
CREATE INDEX IF NOT EXISTS idx_members_generation ON members (generation, graduation_year);

CREATE TABLE IF NOT EXISTS application_sequences (
  name TEXT PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  application_code TEXT UNIQUE NOT NULL,
  member_id TEXT,
  match_status TEXT NOT NULL DEFAULT 'new_record',
  match_confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  ticket_type TEXT NOT NULL,
  fee_period TEXT,
  reception_attendance TEXT,
  attendance_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_provider TEXT NOT NULL DEFAULT 'manual',
  external_payment_id TEXT,
  total_amount_jpy INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  full_name TEXT NOT NULL,
  full_name_kana TEXT,
  maiden_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  graduation_year INTEGER,
  generation TEXT,
  school_lineage TEXT,
  dance_role TEXT,
  postal_code TEXT,
  address TEXT,
  companion_count INTEGER NOT NULL DEFAULT 0,
  expected_transfer_name TEXT,
  actual_transfer_name TEXT,
  message TEXT,
  admin_note TEXT,
  source TEXT NOT NULL DEFAULT 'public_form',
  paid_at TEXT,
  cancelled_at TEXT,
  refunded_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_applications_member_id ON applications (member_id);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications (email);
CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON applications (payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_payment_method ON applications (payment_method, payment_provider);
CREATE INDEX IF NOT EXISTS idx_applications_attendance_status ON applications (attendance_status);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  member_id TEXT,
  stripe_checkout_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,
  amount_total INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'jpy',
  status TEXT NOT NULL DEFAULT 'created',
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  payment_provider TEXT NOT NULL DEFAULT 'manual',
  external_payment_id TEXT,
  actual_transfer_name TEXT,
  ticket_type TEXT NOT NULL,
  stripe_event_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  cancelled_at TEXT,
  refunded_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments (application_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_method_provider ON payments (payment_method, payment_provider);
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

CREATE TABLE IF NOT EXISTS companions (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  relationship TEXT,
  attendee_type TEXT,
  email TEXT,
  note TEXT,
  ticket_type TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE INDEX IF NOT EXISTS idx_companions_application_id ON companions (application_id);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  consent_value INTEGER NOT NULL DEFAULT 0,
  consent_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE INDEX IF NOT EXISTS idx_consents_application_id ON consents (application_id);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL,
  member_id TEXT,
  checked_in_at TEXT,
  reception_status TEXT NOT NULL DEFAULT 'not_checked_in',
  seat_label TEXT,
  memo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (application_id) REFERENCES applications(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_application_id ON attendance (application_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance (reception_status);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  imported_by TEXT,
  environment TEXT NOT NULL DEFAULT 'preview',
  row_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at);
