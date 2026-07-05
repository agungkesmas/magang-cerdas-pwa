-- ============================================================
-- FIX: Update constraint activities_target_check
-- Sekarang izinkan Quest (group_id) sebagai target alternatif
-- Sebelumnya: harus punya intern_id ATAU department
-- Sesudah: harus punya intern_id ATAU department ATAU group_id (untuk Quest)
-- ============================================================

-- Drop constraint lama
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_target_check;

-- Tambah constraint baru: izinkan group_id sebagai target (untuk Quest)
ALTER TABLE activities ADD CONSTRAINT activities_target_check
  CHECK (intern_id IS NOT NULL OR department IS NOT NULL OR group_id IS NOT NULL);

-- Verifikasi
SELECT
  'Constraint activities_target_check updated' as info,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'activities_target_check';
