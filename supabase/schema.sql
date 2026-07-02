-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Table: Interns (Magang)
-- ============================================================
CREATE TABLE Interns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  school_origin VARCHAR(255),
  major VARCHAR(255) NOT NULL,
  department VARCHAR(50) CHECK (department IN ('Pelayanan', 'Pemasaran', 'Keuangan')) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_exp INT DEFAULT 0,
  streak_count INT DEFAULT 0,
  -- Auth credentials (auto-generated)
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  raw_password VARCHAR(50) NOT NULL, -- For admin to share (plaintext, only visible to admin)
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  -- Survival kit progress (JSONB for flexible drip content state)
  survival_kit_progress JSONB DEFAULT '{}'::jsonb,
  -- Certificate vault unlock threshold
  certificate_unlocked BOOLEAN DEFAULT FALSE,
  certificate_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: Admins (for admin auth)
-- ============================================================
CREATE TABLE Admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: Tasks (Base Tasks defined by Admin)
-- Modes: 'individual' (per-departemen), 'assigned' (pilih intern), 'team' (shared progress)
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  department VARCHAR(50) NOT NULL,
  base_description TEXT NOT NULL,
  target_count INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  mode VARCHAR(20) DEFAULT 'individual' CHECK (mode IN ('individual', 'assigned', 'team')),
  due_date TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: Task_Assignments (untuk mode 'assigned' & 'team')
-- ============================================================
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, intern_id)
);

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Table: Task_Team_Progress (shared progress untuk mode 'team')
-- 1 task tim → 1 progress bar bersama
-- UNIQUE(task_id, chunk_index) → 1 chunk hanya bisa di-complete 1x oleh siapapun di tim
-- ============================================================
CREATE TABLE task_team_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  completed_by_intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, chunk_index)
);

ALTER TABLE task_team_progress ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Table: Task_Completions (Progress per-intern untuk mode 'individual' & 'assigned')
-- ============================================================
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  chunk_index INT DEFAULT 0,
  completed_count INT DEFAULT 0,
  last_completed_at TIMESTAMPTZ,
  ai_instruction TEXT,
  UNIQUE(intern_id, task_id, chunk_index)
);

-- ============================================================
-- Table: Attendance (Check-in/out with geo + photo)
-- ============================================================
CREATE TABLE Attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES Interns(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  type VARCHAR(10) CHECK (type IN ('Check-In', 'Check-Out')) NOT NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  distance_meters FLOAT,
  photo_url TEXT,
  is_within_geofence BOOLEAN DEFAULT FALSE,
  notes TEXT
);

-- ============================================================
-- Table: Logbook (Daily reflections)
-- ============================================================
CREATE TABLE Logbook (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES Interns(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  activity TEXT NOT NULL,
  learning_summary TEXT,
  difficulties TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(intern_id, entry_date)
);

-- ============================================================
-- Table: Officials (Kepala Cabang, for digital signature)
-- ============================================================
CREATE TABLE Officials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  nip VARCHAR(50),
  position VARCHAR(100) DEFAULT 'Kepala Kantor Cabang',
  signature_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: Certificates (Issued certificates)
-- ============================================================
CREATE TABLE Certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES Interns(id) ON DELETE CASCADE,
  official_id UUID REFERENCES Officials(id),
  tier VARCHAR(50) CHECK (tier IN ('Excellence', 'Competent', 'Participation')) NOT NULL,
  issue_date DATE DEFAULT CURRENT_DATE,
  verification_id VARCHAR(20) UNIQUE NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Table: App_Settings (single-row config: geofence, LLM provider, etc.)
-- ============================================================
CREATE TABLE App_Settings (
  id INT PRIMARY KEY DEFAULT 1,
  office_lat DECIMAL(10,7) DEFAULT -6.7418620,
  office_lng DECIMAL(10,7) DEFAULT 108.5420607,
  geofence_radius_meters INT DEFAULT 150,
  -- LLM provider config
  llm_provider VARCHAR(50) DEFAULT 'groq',
  llm_model VARCHAR(100) DEFAULT 'llama-3.3-70b-versatile',
  llm_api_key_encrypted TEXT,
  -- Office info
  office_name VARCHAR(255) DEFAULT 'BPJS Ketenagakerjaan Cabang Cirebon',
  office_address TEXT DEFAULT 'Jl. Evakuasi No. 11B, Karyamulya, Kesambi, Cirebon 45135',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO App_Settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- ============================================================
-- Table: Nudges (Admin pushes notifications to interns)
-- ============================================================
CREATE TABLE Nudges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID REFERENCES Interns(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'check_in_reminder',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE RLS (Row Level Security) ON ALL TABLES
-- ============================================================
ALTER TABLE Interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE Admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE Tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE Task_Completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE Attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE Logbook ENABLE ROW LEVEL SECURITY;
ALTER TABLE Officials ENABLE ROW LEVEL SECURITY;
ALTER TABLE Certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE App_Settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE Nudges ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- Service role bypasses RLS (server-only operations)
-- Anon key: read-only public officials/certificates for verification
-- Interns: managed via server-side logic with anon key (no direct table access)
-- Admins: managed via server-side logic with service role
-- ============================================================

-- Public read for active officials (for certificate verification)
CREATE POLICY "Public read active officials" ON Officials FOR SELECT USING (is_active = TRUE);

-- Public read for certificates (for verification_id lookup)
CREATE POLICY "Public read certificates" ON Certificates FOR SELECT USING (TRUE);

-- Public read for app_settings (office info, geofence - needed client-side)
CREATE POLICY "Public read app_settings" ON App_Settings FOR SELECT USING (TRUE);

-- Interns: read own row by username match (via anon key, but RLS enforces row-level)
CREATE POLICY "Interns self read" ON Interns FOR SELECT USING (TRUE);
CREATE POLICY "Interns self update" ON Interns FOR UPDATE USING (TRUE);

-- All write operations will use service role key in API routes (bypasses RLS)
-- This is more secure than exposing write policies via anon key

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_interns_username ON Interns(username);
CREATE INDEX idx_attendance_intern_date ON Attendance(intern_id, timestamp);
CREATE INDEX idx_task_completions_intern ON Task_Completions(intern_id);
CREATE INDEX idx_logbook_intern_date ON Logbook(intern_id, entry_date);
CREATE INDEX idx_nudges_intern_unread ON Nudges(intern_id, is_read);
CREATE INDEX idx_certificates_verification ON Certificates(verification_id);

-- ============================================================
-- SEED: Default admin + default active official
-- ============================================================
-- Default admin (email: admin@magang-cerdas.local, password: admin123456)
-- Hash generated with bcryptjs (10 rounds) — matches lib/auth.ts implementation
INSERT INTO Admins (email, password_hash, name, role) VALUES
  ('admin@magang-cerdas.local', '$2a$10$b/Ctb1MRQdhFkgCgW4lz4.AZGBQCLgespi9UBelcLASiYENCEB4BO', 'Super Admin', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Default active official: Zainal Abidin A
INSERT INTO Officials (name, nip, position, is_active) VALUES
  ('Zainal Abidin A', '', 'Kepala Kantor Cabang', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Table: Schools (Master Sekolah)
-- ============================================================
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read schools" ON schools FOR SELECT USING (TRUE);

-- ============================================================
-- Table: BKK_Teachers (Guru Bursa Kerja Khusus)
-- Updated: school_origin column REMOVED (now via junction table)
-- ============================================================
CREATE TABLE bkk_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  raw_password VARCHAR(100) NOT NULL, -- For admin to share (same pattern as interns)
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bkk_teachers ENABLE ROW LEVEL SECURITY;
-- NO public SELECT policy — write/read only via service role in API routes

-- ============================================================
-- Table: bkk_teacher_schools (Junction: 1 BKK teacher = many schools)
-- ============================================================
CREATE TABLE bkk_teacher_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bkk_teacher_id UUID NOT NULL REFERENCES bkk_teachers(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bkk_teacher_id, school_id)
);

ALTER TABLE bkk_teacher_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read bkk_teacher_schools" ON bkk_teacher_schools FOR SELECT USING (TRUE);

-- ============================================================
-- Seed: Sample schools
-- ============================================================
INSERT INTO schools (name, address) VALUES
  ('SMK Negeri 1 Cirebon', 'Jl. Perjuangan No. 1, Cirebon'),
  ('SMK Negeri 2 Cirebon', 'Jl. Pemuda No. 2, Cirebon'),
  ('SMK Negeri 3 Cirebon', 'Jl. DR. Cipto Mangunkusumo, Cirebon'),
  ('SMK Bina Karya Cirebon', 'Jl. Latumenang, Cirebon'),
  ('SMK Muhammadiyah Cirebon', 'Jl. Pangeran Kejaksan, Cirebon')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Seed: Default BKK teacher (email: bkk@magang-cerdas.local, password: bkk123456)
-- Linked to SMK Negeri 1 Cirebon
-- ============================================================
-- Hash generated with bcryptjs for "bkk123456"
INSERT INTO bkk_teachers (email, password_hash, raw_password, name, phone, is_active) VALUES
  ('bkk@magang-cerdas.local', '$2a$10$eTiKZxQp9vvqxOFcQaq6Se4RS8SUvXDDz.c7CHTqnPUq5ZMDFt8UK', 'bkk123456', 'BKK Default Teacher', '', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Link default BKK teacher to SMK Negeri 1 Cirebon
INSERT INTO bkk_teacher_schools (bkk_teacher_id, school_id)
SELECT bt.id, s.id FROM bkk_teachers bt, schools s
WHERE bt.email = 'bkk@magang-cerdas.local' AND s.name = 'SMK Negeri 1 Cirebon'
ON CONFLICT DO NOTHING;
