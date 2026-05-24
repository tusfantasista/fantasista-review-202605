CREATE TABLE IF NOT EXISTS festa60_interest_registrations (
  id TEXT PRIMARY KEY,
  interest_code TEXT UNIQUE NOT NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_kana TEXT NOT NULL,
  first_kana TEXT NOT NULL,
  maiden_name TEXT,
  graduation_year INTEGER,
  graduation_year_unknown INTEGER NOT NULL DEFAULT 0,
  participant_category TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  attendance_intent TEXT NOT NULL,
  companion_status TEXT,
  companion_count INTEGER,
  companion_host_category TEXT,
  companion_host_last_name TEXT,
  companion_host_first_name TEXT,
  companion_host_graduation_year INTEGER,
  companion_host_note TEXT,
  dance_time_intent TEXT,
  photo_consent TEXT,
  volunteer_interest TEXT,
  donation_interest TEXT,
  sponsorship_interest TEXT,
  archive_material_interest TEXT,
  message TEXT,
  privacy_agreed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'new',
  admin_memo TEXT,
  user_agent TEXT,
  source_path TEXT,
  ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_festa60_interest_code ON festa60_interest_registrations (interest_code);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_email ON festa60_interest_registrations (email);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_created_at ON festa60_interest_registrations (created_at);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_status ON festa60_interest_registrations (status);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_attendance ON festa60_interest_registrations (attendance_intent);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_category ON festa60_interest_registrations (participant_category);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_donation ON festa60_interest_registrations (donation_interest);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_sponsorship ON festa60_interest_registrations (sponsorship_interest);
CREATE INDEX IF NOT EXISTS idx_festa60_interest_archive ON festa60_interest_registrations (archive_material_interest);
