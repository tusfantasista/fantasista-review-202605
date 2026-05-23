UPDATE applications
SET status = 'pending', updated_at = datetime('now')
WHERE payment_method = 'bank_transfer'
  AND payment_provider = 'manual'
  AND payment_status = 'unpaid'
  AND status = 'payment_pending';
