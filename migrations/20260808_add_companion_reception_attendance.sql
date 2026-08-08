ALTER TABLE companions ADD COLUMN reception_attendance TEXT NOT NULL DEFAULT 'attending';

UPDATE companions
SET reception_attendance = COALESCE(
  (SELECT applications.reception_attendance
   FROM applications
   WHERE applications.id = companions.application_id),
  'attending'
);
