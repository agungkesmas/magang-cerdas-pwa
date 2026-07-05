-- ============================================================
-- Migration: Activities — add activity_type, is_broadcast, scheduled_date
-- ============================================================
-- New columns:
--   activity_type VARCHAR(20) DEFAULT 'task' — 'task' atau 'announcement'
--   is_broadcast BOOLEAN DEFAULT FALSE — true kalika target = semua peserta
--   scheduled_date TIMESTAMPTZ — untuk jadwal di masa depan
--
-- Cleanup: set activity_type='task' untuk existing rows yang tidak ada
-- activity_type (backward compat)
--
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Add new columns
ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type VARCHAR(20) DEFAULT 'task';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_broadcast BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;

-- Step 2: Backfill existing rows
-- Rows dengan intern_id = individual task (created by pembina)
UPDATE activities SET activity_type = 'task' WHERE activity_type IS NULL;

-- Step 3: Cleanup old activities yang assign ke 1 peserta oleh admin
-- (sekarang admin tidak bisa assign ke 1 peserta, itu tugas pembina)
-- Tidak perlu hapus — biarkan sebagai history, cuma tidak bisa create baru

-- Step 4: Verify
SELECT 'Columns added:' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'activities' AND column_name IN ('activity_type', 'is_broadcast', 'scheduled_date')
ORDER BY column_name;

SELECT 'Activity type distribution:' as info;
SELECT activity_type, is_broadcast, COUNT(*) as count
FROM activities
GROUP BY activity_type, is_broadcast
ORDER BY activity_type;
