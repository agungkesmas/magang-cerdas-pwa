-- ============================================================
-- MIGRATION FINAL — MAGANG-CERDAS (sekali run, idempotent)
-- Versi: 1.0 — 2026-07-02
-- Jalankan di: Supabase SQL Editor (https://supabase.com/dashboard/project/ktfyzoowgxvllwauqpir/sql/new)
-- 
-- CARA PAKAI:
--   1. Buka Supabase → SQL Editor → New query
--   2. Copy-paste SELURUH isi file ini
--   3. Klik Run (Ctrl+Enter)
--   4. Aman dijalankan berulang — semua pakai IF NOT EXISTS / ON CONFLICT DO NOTHING
-- 
-- ISI:
--   A. Tabel inti (sudah ada di schema.sql — skip kalau sudah)
--   B. Tabel tambahan: schools, bkk_teacher_schools, majors, activities, leave_requests, internship_requests
--   C. Kolom tambahan: email, whatsapp, photo_url, phone, logbook_enabled, mode, due_date, dll
--   D. RLS policies & indexes
--   E. Seed data: schools, default BKK teacher, majors per sekolah, contoh permintaan magang
-- ============================================================

-- ============================================================
-- A. EXTENSION (jika belum)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- B. TABEL: schools (master sekolah mitra)
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  logbook_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read schools" ON schools;
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (TRUE);

-- ============================================================
-- C. TABEL: bkk_teacher_schools (junction 1 BKK → banyak sekolah)
-- ============================================================
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

-- ============================================================
-- D. KOLOM TAMBAHAN ke bkk_teachers (jika belum ada)
-- ============================================================
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS raw_password VARCHAR(100);
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Drop kolom school_origin lama jika masih ada (migrasi ke junction table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bkk_teachers' AND column_name = 'school_origin'
  ) THEN
    -- Pindahkan data lama ke junction table dulu
    INSERT INTO schools (name)
    SELECT DISTINCT school_origin FROM bkk_teachers WHERE school_origin IS NOT NULL AND school_origin != ''
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO bkk_teacher_schools (bkk_teacher_id, school_id)
    SELECT bt.id, s.id
    FROM bkk_teachers bt
    JOIN schools s ON s.name = bt.school_origin
    WHERE bt.school_origin IS NOT NULL AND school_origin != ''
    ON CONFLICT DO NOTHING;

    UPDATE bkk_teachers SET raw_password = 'bkk123456' WHERE raw_password IS NULL OR raw_password = '';

    ALTER TABLE bkk_teachers DROP COLUMN school_origin;
    RAISE NOTICE 'bkk_teachers.school_origin column dropped & data migrated';
  END IF;
END $$;

-- ============================================================
-- E. TABEL: majors (master jurusan per institusi)
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
DROP POLICY IF EXISTS "Public read majors" ON majors;
CREATE POLICY "Public read majors" ON majors FOR SELECT USING (TRUE);

-- Tambah major_id ke interns
ALTER TABLE interns ADD COLUMN IF NOT EXISTS major_id UUID REFERENCES majors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_interns_major_id ON interns(major_id);
CREATE INDEX IF NOT EXISTS idx_majors_school ON majors(school_id);

-- ============================================================
-- F. KOLOM TAMBAHAN ke interns
-- ============================================================
ALTER TABLE interns ADD COLUMN IF NOT EXISTS logbook_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE interns ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);
ALTER TABLE interns ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE interns ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

UPDATE interns SET logbook_enabled = TRUE WHERE logbook_enabled IS NULL;

-- ============================================================
-- G. KOLOM TAMBAHAN ke tasks (mode: individual/assigned/team)
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'individual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_mode_check'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_mode_check CHECK (mode IN ('individual', 'assigned', 'team'));
  END IF;
END $$;

-- ============================================================
-- H. TABEL: task_assignments (untuk mode 'assigned' & 'team')
-- ============================================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, intern_id)
);
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- I. TABEL: task_team_progress (shared progress untuk mode 'team')
-- ============================================================
CREATE TABLE IF NOT EXISTS task_team_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  completed_by_intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, chunk_index)
);
ALTER TABLE task_team_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- J. TABEL: activities (aktivitas harian, pengganti Daily Quest)
-- ============================================================
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  department VARCHAR(50),
  due_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  completed_by_intern_id UUID REFERENCES interns(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  created_by_intern BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT activities_target_check CHECK (intern_id IS NOT NULL OR department IS NOT NULL)
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- K. TABEL: activity_completions (track per-intern untuk mode departemen)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  completion_notes TEXT,
  UNIQUE(activity_id, intern_id)
);
ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activities_intern ON activities(intern_id);
CREATE INDEX IF NOT EXISTS idx_activities_department ON activities(department);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);
CREATE INDEX IF NOT EXISTS idx_activity_completions_activity ON activity_completions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_completions_intern ON activity_completions(intern_id);

-- ============================================================
-- L. TABEL: leave_requests (Sakit/Izin/Cuti/Dinas Luar)
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sakit', 'izin', 'cuti', 'dinas-luar')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  medical_certificate_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT leave_dates_valid CHECK (end_date >= start_date)
);
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_leave_requests_intern ON leave_requests(intern_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- ============================================================
-- M. TABEL: internship_requests (Permintaan Magang BKK → BPJTK)
-- Workflow: draft → submitted → under_review → accepted/rejected → completed/cancelled
-- ============================================================
CREATE TABLE IF NOT EXISTS internship_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bkk_teacher_id UUID NOT NULL REFERENCES bkk_teachers(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  request_title VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  requested_slots INT NOT NULL DEFAULT 1,
  proposed_start_date DATE,
  proposed_end_date DATE,
  requested_majors TEXT,
  requested_departments TEXT,
  cover_letter TEXT,
  additional_notes TEXT,
  attachment_url TEXT,
  status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'completed', 'cancelled')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  accepted_slots INT,
  actual_start_date DATE,
  actual_end_date DATE,
  assigned_departments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE internship_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_internship_requests_bkk ON internship_requests(bkk_teacher_id);
CREATE INDEX IF NOT EXISTS idx_internship_requests_status ON internship_requests(status);
CREATE INDEX IF NOT EXISTS idx_internship_requests_created ON internship_requests(created_at DESC);

-- Trigger update updated_at
CREATE OR REPLACE FUNCTION update_internship_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_internship_requests_updated_at ON internship_requests;
CREATE TRIGGER trg_internship_requests_updated_at
  BEFORE UPDATE ON internship_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_internship_requests_updated_at();

-- ============================================================
-- N. SEED DATA: Sample schools
-- ============================================================
INSERT INTO schools (name, address) VALUES
  ('SMK Negeri 1 Cirebon', 'Jl. Perjuangan No. 1, Cirebon'),
  ('SMK Negeri 2 Cirebon', 'Jl. Pemuda No. 2, Cirebon'),
  ('SMK Negeri 3 Cirebon', 'Jl. DR. Cipto Mangunkusumo, Cirebon'),
  ('SMK Bina Karya Cirebon', 'Jl. Latumenang, Cirebon'),
  ('SMK Muhammadiyah Cirebon', 'Jl. Pangeran Kejaksan, Cirebon')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- O. SEED DATA: Default BKK teacher (bkk@magang-cerdas.local / bkk123456)
-- ============================================================
INSERT INTO bkk_teachers (email, password_hash, raw_password, name, phone, is_active) VALUES
  ('bkk@magang-cerdas.local', '$2a$10$eTiKZxQp9vvqxOFcQaq6Se4RS8SUvXDDz.c7CHTqnPUq5ZMDFt8UK', 'bkk123456', 'BKK Default Teacher', '', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Link default BKK teacher ke SMK Negeri 1 Cirebon
INSERT INTO bkk_teacher_schools (bkk_teacher_id, school_id)
SELECT bt.id, s.id FROM bkk_teachers bt, schools s
WHERE bt.email = 'bkk@magang-cerdas.local' AND s.name = 'SMK Negeri 1 Cirebon'
ON CONFLICT DO NOTHING;

-- Update raw_password untuk BKK yang masih kosong
UPDATE bkk_teachers SET raw_password = 'bkk123456' WHERE raw_password IS NULL OR raw_password = '';

-- ============================================================
-- P. SEED DATA: Majors per sekolah (13 jurusan umum SMK + Kuliah)
-- ============================================================
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
-- Q. SEED DATA: Contoh permintaan magang (demo BKK workflow)
-- ============================================================
-- Permintaan 1: status submitted (menunggu review admin)
INSERT INTO internship_requests (
  bkk_teacher_id, school_name, request_title, contact_person, contact_phone, contact_email,
  requested_slots, proposed_start_date, proposed_end_date,
  requested_majors, requested_departments, cover_letter, additional_notes, status
)
SELECT
  bt.id,
  'SMK Negeri 1 Cirebon',
  'Permintaan Penempatan Magang Semester Ganjil 2026/2027',
  'Drs. Bambang Sutrisno, M.Pd.',
  '081234567890',
  'bkk@smkn1cirebon.sch.id',
  5,
  '2026-07-15'::DATE,
  '2026-12-15'::DATE,
  'Rekayasa Perangkat Lunak, Teknik Komputer Jaringan, Akuntansi',
  'Pelayanan, Pemasaran',
  'Dengan hormat, sehubungan dengan program magang industri (praktik kerja lapangan) bagi siswa kelas XII SMK Negeri 1 Cirebon tahun ajaran 2026/2027, kami mengajukan permohonan penempatan magang di BPJS Ketenagakerjaan Cabang Cirebon. Penempatan magang ini bertujuan untuk memberikan pengalaman kerja nyata kepada siswa sehingga mereka dapat mengaplikasikan ilmu yang dipelajari di sekolah dengan praktik di dunia kerja.',
  'Kami siap mengirimkan surat resmi dari kepala sekolah dan menandatangani perjanjian kerja sama (PKS) jika permohonan ini disetujui.',
  'submitted'
FROM bkk_teachers bt
WHERE bt.email = 'bkk@magang-cerdas.local'
ON CONFLICT DO NOTHING;

-- Permintaan 2: status accepted (history)
INSERT INTO internship_requests (
  bkk_teacher_id, school_name, request_title, contact_person, contact_phone, contact_email,
  requested_slots, proposed_start_date, proposed_end_date,
  requested_majors, requested_departments, cover_letter,
  status, reviewed_at, review_notes, accepted_slots,
  actual_start_date, actual_end_date, assigned_departments, created_at
)
SELECT
  bt.id,
  'SMK Negeri 1 Cirebon',
  'Permintaan Penempatan Magang Semester Genap 2025/2026',
  'Drs. Bambang Sutrisno, M.Pd.',
  '081234567890',
  'bkk@smkn1cirebon.sch.id',
  3,
  '2026-01-15'::DATE,
  '2026-06-15'::DATE,
  'Rekayasa Perangkat Lunak, Akuntansi',
  'Pelayanan, Keuangan',
  'Permintaan magang reguler untuk semester genap.',
  'accepted',
  NOW() - INTERVAL '90 days',
  'Disetujui untuk 3 peserta. Penempatan: 2 di Pelayanan, 1 di Keuangan.',
  3,
  '2026-01-15'::DATE,
  '2026-06-15'::DATE,
  'Pelayanan, Keuangan',
  NOW() - INTERVAL '120 days'
FROM bkk_teachers bt
WHERE bt.email = 'bkk@magang-cerdas.local'
ON CONFLICT DO NOTHING;

-- ============================================================
-- R. MIGRATE DATA: interns.major (string) → interns.major_id (FK)
-- ============================================================
UPDATE interns i
SET major_id = m.id
FROM majors m
JOIN schools s ON m.school_id = s.id
WHERE i.school_origin = s.name
  AND i.major_id IS NULL
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
  );

-- ============================================================
-- S. VERIFIKASI AKHIR
-- ============================================================
SELECT 'MIGRATION FINAL SELESAI' as info
UNION ALL SELECT 'schools: ' || COUNT(*)::text FROM schools
UNION ALL SELECT 'majors: ' || COUNT(*)::text FROM majors
UNION ALL SELECT 'bkk_teachers: ' || COUNT(*)::text FROM bkk_teachers
UNION ALL SELECT 'bkk_teacher_schools: ' || COUNT(*)::text FROM bkk_teacher_schools
UNION ALL SELECT 'interns: ' || COUNT(*)::text FROM interns
UNION ALL SELECT 'interns with major_id: ' || COUNT(*) FILTER (WHERE major_id IS NOT NULL)::text FROM interns
UNION ALL SELECT 'internship_requests: ' || COUNT(*)::text FROM internship_requests
UNION ALL SELECT 'activities: ' || COUNT(*)::text FROM activities
UNION ALL SELECT 'leave_requests: ' || COUNT(*)::text FROM leave_requests
UNION ALL SELECT 'tasks: ' || COUNT(*)::text FROM tasks
UNION ALL SELECT 'task_assignments: ' || COUNT(*)::text FROM task_assignments;

-- ============================================================
-- END OF MIGRATION FINAL
-- Setelah run, dashboard MAGANG-CERDAS siap pakai penuh:
--  - /admin  (admin BPJTK)
--  - /bkk    (guru BKK)
--  - /intern (peserta magang)
-- ============================================================
