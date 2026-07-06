-- ============================================================
-- MIGRATION: Create storage bucket 'attendance-photos'
-- Untuk upload foto selfie check-in/out
--
-- Idempotent — aman di-run ulang
-- ============================================================

-- Create bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attendance-photos', 'attendance-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
DROP POLICY IF EXISTS "Public read attendance-photos" ON storage.objects;
CREATE POLICY "Public read attendance-photos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'attendance-photos');

-- Authenticated upload policy (service role bypasses RLS)
DROP POLICY IF EXISTS "Authenticated upload attendance-photos" ON storage.objects;
CREATE POLICY "Authenticated upload attendance-photos" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'attendance-photos');

-- Authenticated delete policy
DROP POLICY IF EXISTS "Authenticated delete attendance-photos" ON storage.objects;
CREATE POLICY "Authenticated delete attendance-photos" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'attendance-photos');

-- Verifikasi
SELECT COUNT(*) AS bucket_exists FROM storage.buckets WHERE id = 'attendance-photos';
