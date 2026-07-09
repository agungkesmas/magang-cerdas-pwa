-- ============================================================
-- Migration: Fix interns.department CHECK constraint
-- Tambah 'Belum Ditempatkan' sebagai valid value
--
-- Issue: BKK batch-create & admin UI pakai 'Belum Ditempatkan' sebagai default,
-- tapi schema.sql lama hanya izinkan 'Pelayanan', 'Pemasaran', 'Keuangan'.
-- Di fresh DB, insert gagal dengan check constraint violation.
-- ============================================================

-- Drop constraint lama (nama constraint default PostgreSQL: interns_department_check)
ALTER TABLE interns DROP CONSTRAINT IF EXISTS interns_department_check;

-- Tambah constraint baru dengan 4 value
ALTER TABLE interns ADD CONSTRAINT interns_department_check
  CHECK (department IN ('Pelayanan', 'Pemasaran', 'Keuangan', 'Belum Ditempatkan'));

-- Update schema.sql juga (manual edit, tidak bisa via migration)
-- sudah dilakukan di commit yang sama
