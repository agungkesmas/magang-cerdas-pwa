-- ============================================================
-- MIGRATION: Toggle Logbook per Intern
-- Tambah kolom logbook_enabled ke tabel interns (default true)
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- Step 1: Tambah kolom logbook_enabled
ALTER TABLE interns ADD COLUMN IF NOT EXISTS logbook_enabled BOOLEAN DEFAULT TRUE;

-- Step 2: Backfill existing interns (semua dapat logbook aktif secara default)
UPDATE interns SET logbook_enabled = TRUE WHERE logbook_enabled IS NULL;

-- Step 3: Verifikasi
SELECT
  'Total interns: ' || COUNT(*)::text,
  'Logbook enabled: ' || COUNT(*) FILTER (WHERE logbook_enabled = TRUE)::text,
  'Logbook disabled: ' || COUNT(*) FILTER (WHERE logbook_enabled = FALSE)::text
FROM interns;
