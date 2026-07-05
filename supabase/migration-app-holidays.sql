-- ============================================================
-- MIGRATION: Tabel app_holidays — libur khusus BPJS (custom)
--
-- Libur nasional + cuti bersama TIDAK disimpan di sini (hardcoded
-- di src/lib/holidays.ts karena sesuai SKB 3 Menteri).
-- Tabel ini KHUSUS untuk libur BPJS-specific:
--   - HUT BPJS
--   - Pelatihan internal
--   - Libur lokal Cirebon
--   - Acara kantor
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
-- SEED CONTOH (opsional — HUT BPJS 28 Oktober)
-- Hapus kalau tidak relevan
-- ============================================================
INSERT INTO app_holidays (date, name, type) VALUES
  ('2026-10-28', 'HUT BPJS Ketenagakerjaan ke-58', 'bpjs')
ON CONFLICT (date) DO NOTHING;

-- Verifikasi
SELECT 'MIGRATION APP_HOLIDAYS SELESAI' as info
UNION ALL SELECT 'app_holidays table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'app_holidays'
UNION ALL SELECT 'total rows: ' || COUNT(*)::text FROM app_holidays;
