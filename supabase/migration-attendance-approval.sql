-- ============================================================
-- MIGRATION: Tambah kolom approval di tabel attendance
--
-- Tujuan: Check-in/check-out di hari libur (weekend/nasional/custom)
-- butuh persetujuan pembina sebelum EXP diberikan.
--
-- Alur:
-- 1. Peserta check-in di hari Sabtu/Minggu/libur → insert dengan
--    approval_status='pending', EXP BELUM diberikan
-- 2. Pembina dapat notifikasi di /pembina/home (section "Pending Approval")
-- 3. Pembina approve → update approval_status='approved', grant EXP, send nudge
-- 4. Pembina reject → update approval_status='rejected', no EXP
--
-- Check-in di weekday normal → langsung approved, EXP langsung diberikan
-- (backward compatible — kolom approval_status default 'approved')
--
-- Idempotent — aman di-run ulang
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Tambah kolom approval
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'approved';
-- approval_status: 'pending' | 'approved' | 'rejected'
-- Default 'approved' supaya data lama (yang sudah ada) tetap valid

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approved_by UUID;
-- approved_by: references pembina_magang(id) — siapa pembina yang approve/reject

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
-- approved_at: kapan di-approve/reject

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS approval_notes TEXT;
-- approval_notes: catatan pembina saat approve/reject (opsional)

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_holiday_checkin BOOLEAN DEFAULT FALSE;
-- is_holiday_checkin: true kalau check-in di hari libur/weekend (untuk filter & analytics)

-- Step 2: Backfill data lama — semua attendance existing dianggap 'approved'
UPDATE attendance
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- Step 3: Index untuk performance (query pending approval by pembina)
CREATE INDEX IF NOT EXISTS idx_attendance_pending_approval
  ON attendance(approval_status, is_holiday_checkin)
  WHERE approval_status = 'pending';

-- Step 4: Verifikasi
SELECT 'MIGRATION APPROVAL SELESAI' as info
UNION ALL SELECT 'approval_status column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'approval_status'
UNION ALL SELECT 'approved_by column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'approved_by'
UNION ALL SELECT 'approved_at column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'approved_at'
UNION ALL SELECT 'is_holiday_checkin column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'is_holiday_checkin'
UNION ALL SELECT 'existing rows marked approved: ' || COUNT(*)::text FROM attendance WHERE approval_status = 'approved';
