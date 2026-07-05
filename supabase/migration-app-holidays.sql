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
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS app_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(20) DEFAULT 'custom', -- 'national' | 'bpjs' | 'custom' (hanya untuk display)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_holidays ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_app_holidays_date ON app_holidays(date);

-- ============================================================
-- CLEANUP: Hapus data HUT BPJS yang ngawur (BUKAN libur nasional)
-- Kalau sebelumnya sudah ter-insert dari migration versi lama, hapus di sini
-- ============================================================
DELETE FROM app_holidays
WHERE name ILIKE '%HUT BPJS%'
   OR name ILIKE '%BPJS Ketenagakerjaan ke%';

-- Tidak ada seed default — admin tambah sendiri via UI Pengaturan → Hari Libur

-- Verifikasi
SELECT 'MIGRATION APP_HOLIDAYS SELESAI' as info
UNION ALL SELECT 'app_holidays table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'app_holidays'
UNION ALL SELECT 'total rows: ' || COUNT(*)::text FROM app_holidays
UNION ALL SELECT 'HUT BPJS (harus 0): ' || COUNT(*)::text FROM app_holidays WHERE name ILIKE '%HUT BPJS%';
