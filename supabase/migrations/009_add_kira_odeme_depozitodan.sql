-- Add new transaction type: deposit used for rent payment
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'kira_odeme_depozitodan';

