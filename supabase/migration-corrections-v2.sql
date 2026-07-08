-- ============================================================
-- Migration: Update fitur koreksi + izin pulang cepat
--
-- 1. Tambah kolom actual_time di attendance_corrections
-- 2. Tambah kolom is_correction, correction_id di attendance
-- 3. Buat tabel early_leave_requests
--
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Tambah kolom actual_time di attendance_corrections
-- (jam sebenarnya yang diinput peserta, mis. 07:45 atau 17:30)
ALTER TABLE attendance_corrections
ADD COLUMN IF NOT EXISTS actual_time TIME;

-- Step 2: Tambah kolom is_correction + correction_id di attendance
-- (untuk tandai record yang dibuat dari koreksi, bukan absen langsung)
ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS is_correction BOOLEAN DEFAULT false;

ALTER TABLE attendance
ADD COLUMN IF NOT EXISTS correction_id UUID REFERENCES attendance_corrections(id);

-- Step 3: Buat tabel early_leave_requests
-- (izin pulang lebih cepat sebelum jam 17:00, butuh approval admin)
CREATE TABLE IF NOT EXISTS early_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES interns(id),
  attendance_id UUID REFERENCES attendance(id),
  request_date DATE NOT NULL,
  actual_checkout_time TIMESTAMPTZ,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES admins(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(intern_id, request_date)
);

CREATE INDEX IF NOT EXISTS idx_early_leave_intern ON early_leave_requests(intern_id);
CREATE INDEX IF NOT EXISTS idx_early_leave_status ON early_leave_requests(status);

-- Step 4: Verify
SELECT '=== KOLOM BARU ===' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendance_corrections'
  AND column_name = 'actual_time';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'attendance'
  AND column_name IN ('is_correction', 'correction_id');

SELECT '=== TABEL early_leave_requests ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'early_leave_requests'
ORDER BY ordinal_position;
