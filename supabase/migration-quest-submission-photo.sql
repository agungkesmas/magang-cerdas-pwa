-- ============================================================
-- Migration: Tambah submission_photo_url ke quest_logs
--
-- Issue: Saat submit quest, peserta hanya input keterangan text.
-- Tidak ada bukti visual hasil kerja.
--
-- Effect:
--   - Peserta bisa upload foto bukti (opsional) saat submit quest
--   - Foto disimpan di storage bucket attendance-photos
--   - Admin & pembina bisa lihat foto saat review Quest Card
-- ============================================================

ALTER TABLE quest_logs ADD COLUMN IF NOT EXISTS submission_photo_url TEXT;

-- Index untuk query "quest dengan foto" (audit trail)
CREATE INDEX IF NOT EXISTS idx_quest_logs_photo
  ON quest_logs(submission_photo_url) WHERE submission_photo_url IS NOT NULL;

-- Update schema.sql juga (manual edit, tidak bisa via migration)
