-- Migration: 006_update_islem_turu_enum.sql
-- Description: Update islem_turu enum values and migrate existing data

-- 1. Add new enum values first (PostgreSQL requires this before dropping old ones)
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'tahakkuk_kira';
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'kira_odemesi_nakit';
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'kira_odemesi_banka';
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'kira_odemesi_stopaj';
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'depozito_nakit';
ALTER TYPE islem_turu ADD VALUE IF NOT EXISTS 'depozito_banka';

-- 2. Update existing data
UPDATE islemler SET tur = 'tahakkuk_kira' WHERE tur = 'kira_tahakkuku';
UPDATE islemler SET tur = 'kira_odemesi_nakit' WHERE tur = 'kira_odeme_nakit';
UPDATE islemler SET tur = 'kira_odemesi_banka' WHERE tur = 'kira_odeme_banka';
UPDATE islemler SET tur = 'kira_odemesi_stopaj' WHERE tur = 'kira_odeme_stopaj';

-- 3. Rename old enum values (requires dropping and recreating - optional, can keep both for compatibility)
-- Note: PostgreSQL doesn't support renaming enum values directly
-- If you want to remove old values, you need to:
-- a. Drop the dependent objects
-- b. Drop the old type and recreate with new values
-- For now, old values are kept for backward compatibility but new ones are recommended

-- 4. Update the display labels if stored in any table (none found)
