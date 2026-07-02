-- ============================================================
-- MIGRATION: Toggle Logbook per Institusi (bukan per peserta)
-- Pindah logbook_enabled dari interns → schools
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Step 1: Tambah kolom logbook_enabled ke schools (default TRUE)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logbook_enabled BOOLEAN DEFAULT TRUE;

-- Step 2: Backfill existing schools dengan TRUE
UPDATE schools SET logbook_enabled = TRUE WHERE logbook_enabled IS NULL;

-- Step 3: Catatan — kolom interns.logbook_enabled TETAP DIPERTAHANKAN untuk backward compat
-- Tapi logic aplikasi sekarang baca dari schools.logbook_enabled
-- (Tidak perlu drop interns.logbook_enabled, lebih aman)

-- Step 4: Verifikasi
SELECT
  'schools count: ' || COUNT(*)::text,
  'schools with logbook enabled: ' || COUNT(*) FILTER (WHERE logbook_enabled = TRUE)::text,
  'schools with logbook disabled: ' || COUNT(*) FILTER (WHERE logbook_enabled = FALSE)::text
FROM schools;
