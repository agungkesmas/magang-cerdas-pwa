-- ============================================================
-- MIGRATION SCRIPT: BKK Multi-School Support
-- Jalankan di Supabase SQL Editor JIKA Anda sudah run schema.sql versi lama
-- (yang punya kolom school_origin di tabel bkk_teachers)
-- ============================================================

-- Step 1: Buat tabel schools jika belum ada
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read schools" ON schools;
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (TRUE);

-- Step 2: Buat tabel junction bkk_teacher_schools jika belum ada
CREATE TABLE IF NOT EXISTS bkk_teacher_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bkk_teacher_id UUID NOT NULL REFERENCES bkk_teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bkk_teacher_id, school_id)
);
ALTER TABLE bkk_teacher_schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read bkk_teacher_schools" ON bkk_teacher_schools;
CREATE POLICY "Public read bkk_teacher_schools" ON bkk_teacher_schools FOR SELECT USING (TRUE);

-- Step 3: Tambah kolom baru ke bkk_teachers jika belum ada
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS raw_password VARCHAR(100);
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Step 4: Fix RLS policy yang bocor
DROP POLICY IF EXISTS "BKK Teachers self read" ON bkk_teachers;
-- Tidak ada policy baru — bkk_teachers hanya diakses via service role

-- Step 5: Migrasi data school_origin lama ke tabel schools + junction
-- (Hanya jalan jika kolom school_origin masih ada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bkk_teachers' AND column_name = 'school_origin'
  ) THEN
    -- Insert semua school_origin unik ke tabel schools
    INSERT INTO schools (name)
    SELECT DISTINCT school_origin FROM bkk_teachers WHERE school_origin IS NOT NULL AND school_origin != ''
    ON CONFLICT (name) DO NOTHING;

    -- Link setiap BKK teacher ke school-nya (data lama)
    INSERT INTO bkk_teacher_schools (bkk_teacher_id, school_id)
    SELECT bt.id, s.id
    FROM bkk_teachers bt
    JOIN schools s ON s.name = bt.school_origin
    WHERE bt.school_origin IS NOT NULL AND bt.school_origin != ''
    ON CONFLICT DO NOTHING;

    -- Update raw_password untuk BKK yang masih kosong (default bkk123456)
    UPDATE bkk_teachers SET raw_password = 'bkk123456' WHERE raw_password IS NULL OR raw_password = '';

    -- Drop kolom school_origin (sudah tidak dipakai)
    ALTER TABLE bkk_teachers DROP COLUMN school_origin;

    RAISE NOTICE 'Migration completed: school_origin column dropped, data moved to schools + bkk_teacher_schools';
  ELSE
    RAISE NOTICE 'school_origin column not found — already migrated or fresh install';
  END IF;
END $$;

-- Step 6: Seed sample schools (jika tabel masih kosong)
INSERT INTO schools (name, address)
SELECT * FROM (VALUES
  ('SMK Negeri 1 Cirebon', 'Jl. Perjuangan No. 1, Cirebon'),
  ('SMK Negeri 2 Cirebon', 'Jl. Pemuda No. 2, Cirebon'),
  ('SMK Negeri 3 Cirebon', 'Jl. DR. Cipto Mangunkusumo, Cirebon')
) AS t(name, address)
WHERE NOT EXISTS (SELECT 1 FROM schools LIMIT 1)
ON CONFLICT DO NOTHING;

-- Step 7: Verifikasi
SELECT 'schools count: ' || COUNT(*)::text FROM schools
UNION ALL
SELECT 'bkk_teachers count: ' || COUNT(*)::text FROM bkk_teachers
UNION ALL
SELECT 'bkk_teacher_schools count: ' || COUNT(*)::text FROM bkk_teacher_schools;
