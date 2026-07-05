-- ============================================================
-- MIGRATION: Tabel activities (pengganti Daily Quest)
-- Konsep: 1 aktivitas = 1 tugas konkret dari pembimbing
--         1 klik "Selesai" = +20 EXP
--         Tidak ada chunking, tidak ada AI parafrase
-- ============================================================

-- Step 1: Buat tabel activities
CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  -- Target: bisa per-intern ATAU per-departemen
  intern_id UUID REFERENCES interns(id) ON DELETE CASCADE,
  department VARCHAR(50), -- jika intern_id NULL, assign ke semua intern di departemen ini
  -- Deadline opsional
  due_date TIMESTAMPTZ,
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  completed_by_intern_id UUID REFERENCES interns(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  -- Audit
  created_by UUID, -- admin id
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Constraint: harus punya salah satu (intern_id ATAU department)
  CONSTRAINT activities_target_check CHECK (intern_id IS NOT NULL OR department IS NOT NULL)
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

-- Step 2: Tabel activity_completions (track siapa yang sudah selesai, untuk mode department)
-- Untuk mode per-intern, completion disimpan langsung di activities.completed_by_intern_id
-- Untuk mode per-departemen, perlu track per-intern
CREATE TABLE IF NOT EXISTS activity_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, intern_id)
);

ALTER TABLE activity_completions ENABLE ROW LEVEL SECURITY;

-- Step 3: Index untuk performance
CREATE INDEX IF NOT EXISTS idx_activities_intern ON activities(intern_id);
CREATE INDEX IF NOT EXISTS idx_activities_department ON activities(department);
CREATE INDEX IF NOT EXISTS idx_activities_active ON activities(is_active);
CREATE INDEX IF NOT EXISTS idx_activity_completions_activity ON activity_completions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_completions_intern ON activity_completions(intern_id);

-- Step 4: Verifikasi
SELECT 'activities table created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activities')
UNION ALL
SELECT 'activity_completions table created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_completions');
