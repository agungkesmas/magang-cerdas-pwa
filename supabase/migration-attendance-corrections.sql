-- ============================================================
-- Migration: Logika absen + fitur koreksi absen
--
-- 1. Tambah kolom is_late, is_early di tabel attendance
-- 2. Buat tabel attendance_corrections untuk fitur koreksi
--
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Tambah kolom is_late (check-in setelah 08:00 WIB)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

-- Step 2: Tambah kolom is_early (check-out sebelum 17:00 WIB)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS is_early BOOLEAN DEFAULT false;

-- Step 3: Buat tabel attendance_corrections
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES interns(id),
  correction_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Check-In', 'Check-Out')),
  reason TEXT NOT NULL,
  promise_not_repeat BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES admins(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Satu koreksi per tanggal per tipe per peserta
  UNIQUE(intern_id, correction_date, type)
);

-- Step 4: Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_intern ON attendance_corrections(intern_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_date ON attendance_corrections(correction_date);

-- Step 5: Verify
SELECT '=== KOLOM BARU DI attendance ===' as info;
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'attendance'
  AND column_name IN ('is_late', 'is_early')
ORDER BY column_name;

SELECT '=== TABEL attendance_corrections ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'attendance_corrections'
ORDER BY ordinal_position;
