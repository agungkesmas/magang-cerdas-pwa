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

-- Drop policy kalau sudah ada (idempotent), lalu create ulang
DROP POLICY IF EXISTS "Public read certificate_settings" ON certificate_settings;
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

-- Storage policies: drop dulu kalau ada, lalu create (idempotent)
DROP POLICY IF EXISTS "Public read certificate-assets" ON storage.objects;
CREATE POLICY "Public read certificate-assets" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'certificate-assets');

DROP POLICY IF EXISTS "Authenticated upload certificate-assets" ON storage.objects;
CREATE POLICY "Authenticated upload certificate-assets" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'certificate-assets');

DROP POLICY IF EXISTS "Authenticated update certificate-assets" ON storage.objects;
CREATE POLICY "Authenticated update certificate-assets" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'certificate-assets');

DROP POLICY IF EXISTS "Authenticated delete certificate-assets" ON storage.objects;
CREATE POLICY "Authenticated delete certificate-assets" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'certificate-assets');

-- === 4. Verifikasi (query sederhana, tanpa UNION) ===
SELECT COUNT(*) AS cert_settings_rows FROM certificate_settings;

SELECT COUNT(*) AS storage_bucket_exists FROM storage.buckets WHERE id = 'certificate-assets';
