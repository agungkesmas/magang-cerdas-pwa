-- ============================================================
-- MIGRATION: Add email + whatsapp to interns, whatsapp to bkk_teachers
-- ============================================================
ALTER TABLE interns ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE interns ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
