-- ============================================================
-- MIGRATION: Tabel master majors + Restrukturisasi hierarki Sekolah→Jurusan→Peserta
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- Step 1: Buat tabel majors (master jurusan per institusi)
-- ============================================================
CREATE TABLE IF NOT EXISTS majors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(school_id, name)
);

ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read majors" ON majors FOR SELECT USING (TRUE);

-- ============================================================
-- Step 2: Tambah kolom major_id ke interns (nullable dulu, untuk migrasi data)
-- ============================================================
ALTER TABLE interns ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES majors(id) ON DELETE SET NULL;

-- ============================================================
-- Step 3: Seed majors untuk sekolah yang sudah ada
-- ============================================================
-- Untuk setiap school, insert major-major umum (SMK + Kuliah)
-- Pakai INSERT ... ON CONFLICT agar idempoten
INSERT INTO majors (school_id, name, code)
SELECT s.id, m.name, m.code
FROM schools s
CROSS JOIN (VALUES
  ('Rekayasa Perangkat Lunak', 'RPL'),
  ('Teknik Komputer dan Jaringan', 'TKJ'),
  ('Akuntansi dan Keuangan Lembaga', 'AKL'),
  ('Otomatisasi Tata Kelola Perkantoran', 'OTKP'),
  ('Manajemen Perkantoran dan Layanan Bisnis', 'MPLB'),
  ('Bisnis Daring dan Pemasaran', 'BDP'),
  ('Desain Komunikasi Visual', 'DKV'),
  ('Computer Science', 'CS'),
  ('Management', 'MGT'),
  ('Economics', 'ECO'),
  ('Public Relations', 'PR'),
  ('Law', 'LAW'),
  ('Psychology', 'PSY')
) AS m(name, code)
ON CONFLICT (school_id, name) DO NOTHING;

-- ============================================================
-- Step 4: Migrate data lama — set major_id berdasarkan string match
-- interns.major (string) → majors.id (FK)
-- ============================================================
UPDATE interns i
SET major_id = m.id
FROM majors m
JOIN schools s ON m.school_id = s.id
WHERE i.school_origin = s.name
  AND (
    LOWER(i.major) = LOWER(m.name)
    OR LOWER(i.major) = LOWER(m.code)
    OR (LOWER(i.major) LIKE '%rpl%' AND LOWER(m.name) LIKE '%rekayasa%')
    OR (LOWER(i.major) LIKE '%tkj%' AND LOWER(m.name) LIKE '%teknik komputer%')
    OR (LOWER(i.major) LIKE '%akl%' AND LOWER(m.name) LIKE '%akuntansi%')
    OR (LOWER(i.major) LIKE '%otkp%' AND LOWER(m.name) LIKE '%otomatisasi%')
    OR (LOWER(i.major) LIKE '%mplb%' AND LOWER(m.name) LIKE '%manajemen perkantoran%')
    OR (LOWER(i.major) LIKE '%bdp%' AND LOWER(m.name) LIKE '%bisnis daring%')
    OR (LOWER(i.major) LIKE '%dkv%' AND LOWER(m.name) LIKE '%desain komunikasi%')
    OR (LOWER(i.major) LIKE '%computer science%' AND LOWER(m.name) LIKE '%computer science%')
  )
WHERE i.major_id IS NULL;

-- ============================================================
-- Step 5: Index untuk performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_majors_school ON majors(school_id);
CREATE INDEX IF NOT EXISTS idx_interns_major_id ON interns(major_id);

-- ============================================================
-- Step 6: Verifikasi
-- ============================================================
SELECT 'majors count: ' || COUNT(*)::text FROM majors
UNION ALL
SELECT 'interns with major_id: ' || COUNT(*) FILTER (WHERE major_id IS NOT NULL)::text FROM interns
UNION ALL
SELECT 'interns without major_id (still need manual fix): ' || COUNT(*) FILTER (WHERE major_id IS NULL)::text FROM interns;
