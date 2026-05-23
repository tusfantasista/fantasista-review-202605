UPDATE applications
SET match_status = 'exact_match', updated_at = datetime('now')
WHERE match_status = 'matched';

UPDATE applications
SET match_status = 'new_record', updated_at = datetime('now')
WHERE match_status = 'unmatched';
