-- Migration: 007_drop_merkez_kuru.sql
-- Description: Remove merkez_kuru column from doviz_kurlari table

ALTER TABLE doviz_kurlari DROP COLUMN IF EXISTS merkez_kuru;
