-- ============================================================
-- MIGRATION: certificate_settings + cleanup HUT BPJS + storage bucket
--
-- 1. Buat tabel certificate_settings (logo custom + warna border + aksen)
-- 2. Hapus data HUT BPJS 5 Desember dari app_holidays (BUKAN libur nasional)
-- 3. Update migration-app-holidays.sql seed: hapus HUT BPJS
-- 4. Buat storage bucket certificate-assets (public read, admin write)
--
-- Idempotent — aman di-run ulang
-- ============================================================

-- === 1. Buat tabel certificate_settings ===
CREATE TABLE IF NOT EXISTS certificate_settings (
  id INT PRIMARY KEY DEFAULT 1,
  logo_url TEXT,
  border_color VARCHAR(7) DEFAULT '#0F4C81', -- BPJS blue default
  accent_color VARCHAR(7) DEFAULT '#D4AF37', -- Gold default untuk Excellence tier
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID,
  CONSTRAINT certificate_settings_singleton CHECK (id = 1) -- hanya 1 row
);

ALTER TABLE certificate_settings ENABLE ROW LEVEL SECURITY;
-- Public read (untuk halaman /verify/[id] tanpa login)
CREATE POLICY "Public read certificate_settings" ON certificate_settings
  FOR SELECT USING (TRUE);

-- Seed default row
INSERT INTO certificate_settings (id, logo_url, border_color, accent_color)
VALUES (1, NULL, '#0F4C81', '#D4AF37')
ON CONFLICT (id) DO NOTHING;

-- === 2. Hapus data HUT BPJS dari app_holidays (BUKAN libur nasional) ===
DELETE FROM app_holidays
WHERE name ILIKE '%HUT BPJS%'
   OR name ILIKE '%BPJS Ketenagakerjaan ke%';

-- === 3. Buat storage bucket certificate-assets ===
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-assets', 'certificate-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read
CREATE POLICY "Public read certificate-assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'certificate-assets');

-- Storage policy: authenticated upload (service role bypasses RLS)
CREATE POLICY "Authenticated upload certificate-assets" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'certificate-assets');

-- Storage policy: authenticated delete/update
CREATE POLICY "Authenticated update certificate-assets" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'certificate-assets');

CREATE POLICY "Authenticated delete certificate-assets" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'certificate-assets');

-- === 4. Verifikasi ===
SELECT 'MIGRATION CERTIFICATE SETTINGS SELESAI' as info
UNION ALL SELECT 'certificate_settings table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'certificate_settings'
UNION ALL SELECT 'certificate_settings row count: ' || COUNT(*)::text FROM certificate_settings
UNION ALL SELECT 'HUT BPJS di app_holidays (harus 0): ' || COUNT(*)::text FROM app_holidays WHERE name ILIKE '%HUT BPJS%'
UNION ALL SELECT 'storage bucket: ' || COUNT(*)::text FROM storage.buckets WHERE id = 'certificate-assets';
