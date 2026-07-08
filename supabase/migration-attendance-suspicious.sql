-- ============================================================
-- Migration: Tambah kolom flag mencurigakan untuk attendance
--
-- Tujuan: Admin/pembina bisa tandai foto check-in mencurigakan
-- (beda orang, foto benda, screenshot). Sistem auto-nudge peserta.
--
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Tambah kolom is_suspicious (boolean, default false)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;

-- Step 2: Tambah kolom suspicious_flagged_by (siapa yang flag)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS suspicious_flagged_by UUID REFERENCES admins(id);

-- Step 3: Tambah kolom suspicious_flagged_at (kapan diflag)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS suspicious_flagged_at TIMESTAMPTZ;

-- Step 4: Tambah kolom suspicious_reason (alasan flag)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;

-- Step 5: Tambah kolom auto_flag_reason (kalau auto-detected pattern)
-- Isi otomatis oleh sistem kalau ada pattern mencurigakan
-- (mis. "GPS distance sama persis 5 hari berturut", "timestamp identik")
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS auto_flag_reason TEXT;

-- Step 6: Verify
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance'
  AND column_name IN ('is_suspicious', 'suspicious_flagged_by', 'suspicious_flagged_at', 'suspicious_reason', 'auto_flag_reason')
ORDER BY column_name;
