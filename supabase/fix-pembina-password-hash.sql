-- ============================================================
-- FIX: Update hash password pembina yang salah di DB
-- Jalankan di Supabase SQL Editor untuk fix login pembina default
-- ============================================================
-- Masalah: migration sebelumnya pakai hash placeholder yang TIDAK match
-- dengan password "pembina123456". Login pembina default gagal.
--
-- Fix: update hash dengan yang benar (bcrypt untuk "pembina123456")
-- ============================================================

UPDATE pembina_magang
SET password_hash = '$2a$10$9KOBpXYaAV7HJ5lgaBur5eZT8cRASjZLQX/HEgAr4OPUEmg4mxaqS',
    raw_password = 'pembina123456'
WHERE email IN (
  'pembina@magang-cerdas.local',
  'pembina.keuangan@magang-cerdas.local',
  'pembina.pemasaran@magang-cerdas.local'
);

-- Verifikasi
SELECT pembina_id, email, name, department, raw_password
FROM pembina_magang
WHERE email IN (
  'pembina@magang-cerdas.local',
  'pembina.keuangan@magang-cerdas.local',
  'pembina.pemasaran@magang-cerdas.local'
);

-- ============================================================
-- KREDENSIAL LOGIN PEMBINA DEFAULT (setelah fix):
--
-- Email: pembina@magang-cerdas.local
-- Password: pembina123456
-- ID: PB-0001
--
-- Email: pembina.keuangan@magang-cerdas.local
-- Password: pembina123456
-- ID: PB-0002
--
-- Email: pembina.pemasaran@magang-cerdas.local
-- Password: pembina123456
-- ID: PB-0003
--
-- Catatan: LOGIN PEMBINA PAKAI EMAIL, BUKAN ID
-- ============================================================
