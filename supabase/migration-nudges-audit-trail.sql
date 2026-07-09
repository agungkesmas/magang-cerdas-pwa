-- ============================================================
-- Migration: Tambah kolom audit trail ke tabel nudges
--
-- Issue: /api/nudge/send insert created_by_type, created_by_id, created_by_name
-- tapi schema.sql tidak punya kolom-kolom ini.
-- Di fresh DB, semua nudge BKK/admin/pembina gagal insert.
--
-- Effect:
--   - Bisa track siapa pengirim nudge (admin/bkk/pembina/system)
--   - BKK bisa lihat history nudge yang dia kirim
--   - Admin bisa audit nudge yang dikirim BKK
-- ============================================================

-- Tambah kolom audit (IF NOT EXISTS untuk idempotent)
ALTER TABLE nudges ADD COLUMN IF NOT EXISTS created_by_type VARCHAR(20);
ALTER TABLE nudges ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE nudges ADD COLUMN IF NOT EXISTS created_by_name VARCHAR(255);

-- Index untuk query "nudge by sender" (BKK lihat history sendiri)
CREATE INDEX IF NOT EXISTS idx_nudges_sender
  ON nudges(created_by_type, created_by_id);

-- Backfill data lama (yang tidak punya created_by_*)
-- Asumsi: nudge lama yang created_by_type IS NULL = system/admin default
UPDATE nudges
SET created_by_type = 'system',
    created_by_name = 'System'
WHERE created_by_type IS NULL;

-- Update schema.sql juga (manual edit, tidak bisa via migration)
-- sudah dilakukan di commit yang sama
