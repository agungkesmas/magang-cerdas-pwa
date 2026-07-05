-- ============================================================
-- MIGRATION: Tabel app_holidays — libur khusus BPJS (custom)
--
-- Libur nasional + cuti bersama TIDAK disimpan di sini (hardcoded
-- di src/lib/holidays.ts karena sesuai SKB 3 Menteri).
-- Tabel ini KHUSUS untuk libur BPJS-specific:
--   - Pelatihan internal
--   - Libur lokal Cirebon
--   - Acara kantor
--
-- CATATAN PENTING:
--   HUT BPJS Ketenagakerjaan (5 Desember) BUKAN libur nasional.
--   Jangan tambahkan ke tabel ini kecuali memang ada kebijakan libur
--   khusus dari BPJS Cabang Cirebon.
--
-- Idempotent — aman di-run ulang
-- CARA PAKAI: Run di Supabase SQL Editor (copy SELURUH isi file ini)
-- ============================================================

-- Step 1: Buat tabel kalau belum ada
CREATE TABLE IF NOT EXISTS app_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(20) DEFAULT 'custom',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE app_holidays ENABLE ROW LEVEL SECURITY;

-- Step 3: Index
CREATE INDEX IF NOT EXISTS idx_app_holidays_date ON app_holidays(date);

-- Step 4: Hapus data HUT BPJS yang ngawur (BUKAN libur nasional)
DELETE FROM app_holidays
WHERE name ILIKE '%HUT BPJS%'
   OR name ILIKE '%BPJS Ketenagakerjaan ke%';

-- Step 5: Verifikasi (query sederhana, tanpa UNION)
SELECT COUNT(*) AS total_custom_holidays FROM app_holidays;

SELECT COUNT(*) AS hut_bpjs_remaining FROM app_holidays
WHERE name ILIKE '%HUT BPJS%';
