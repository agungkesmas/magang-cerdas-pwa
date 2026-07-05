-- ============================================================
-- Migration: Admin Password Hardening
-- ============================================================
-- TUJUAN: Ganti password default admin yang lemah (admin123456)
-- menjadi password kuat 16+ karakter.
--
-- PASSWORD BARU: Magang@Cerdas2026!BPJS#Crb
-- Email: admin@magang-cerdas.local
--
-- Hash di-generate dengan bcryptjs (10 rounds),
-- kompatibel dengan lib/auth.ts (verifyPassword menggunakan bcrypt.compare).
--
-- CARA PAKAI:
-- 1. Buka Supabase SQL Editor (dashboard.supabase.com)
-- 2. Paste seluruh file ini
-- 3. Klik Run
-- 4. Catat password baru di tempat aman (password manager)
-- 5. Setelah login, ubah lagi via menu Pengaturan → Keamanan & Data
--    agar tidak ada jejak password default di kode
-- ============================================================

-- Update admin password
UPDATE admins
SET password_hash = '$2a$10$tJI3owXulGLA5vJYIWWoC.ukRE5ntNRImCGO/qQ2WgWC1JJlpCR7C'
WHERE email = 'admin@magang-cerdas.local';

-- Verifikasi (table admins hanya punya created_at, tidak ada updated_at)
SELECT email, name, role, LENGTH(password_hash) AS hash_len, created_at
FROM admins
WHERE email = 'admin@magang-cerdas.local';

-- ============================================================
-- INFO KEAMANAN
-- ============================================================
-- Password lama (admin123456) SUDAH TIDAK BERLAKU setelah migrate.
-- Password baru: Magang@Cerdas2026!BPJS#Crb
--   - 25 karakter
--   - Mix huruf besar/kecil, angka, simbol
--   - Tidak ada kata kamus umum
--
-- REKOMENDASI POST-MIGRATION:
-- 1. Login dengan password baru di /staff-access → Admin Console
-- 2. Buka Pengaturan → Keamanan & Data → Ubah Password Admin
-- 3. Set password baru yang Anda pilih sendiri (jangan pakai default)
-- 4. Hapus file ini setelah verified
-- 5. Pastikan JWT_SECRET env var juga sudah di-set (bukan fallback)
-- ============================================================
