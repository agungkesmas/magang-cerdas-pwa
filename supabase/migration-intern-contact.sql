-- ============================================================
-- MIGRATION: Add email + whatsapp to interns
-- ============================================================
ALTER TABLE interns ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE interns ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
