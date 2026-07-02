-- ============================================================
-- MIGRATION: Add photo_url + phone to interns, photo_url to bkk_teachers
-- ============================================================

ALTER TABLE interns ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Verifikasi
SELECT 'interns photo_url added' as status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interns' AND column_name = 'photo_url')
UNION ALL
SELECT 'bkk_teachers photo_url added' as status
WHERE EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bkk_teachers' AND column_name = 'photo_url');
