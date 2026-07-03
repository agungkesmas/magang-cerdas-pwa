-- ============================================================
-- MIGRATION: Aktivitas Recurring Harian dalam Range Tanggal
-- Konsep "booking hotel" — admin set range sekali, sistem auto-reset tiap hari
-- ============================================================
-- Fitur:
--   1. Aktivitas punya start_date & end_date (range)
--   2. is_recurring = TRUE → muncul tiap hari di range, completion per-hari
--   3. Tabel baru activity_daily_completions untuk track completion harian
--   4. UNIQUE constraint mencegah double completion di hari yang sama
--
-- BACKWARD COMPATIBLE:
--   - Aktivitas existing tetap jalan (is_recurring = FALSE, start_date NULL)
--   - Mode lama (1x completion) tetap dipertahankan
--
-- ROLLBACK:
--   Lihat file: supabase/rollback-activity-recurring.sql
-- ============================================================

-- Step 1: Tambah kolom range & flag recurring ke tabel activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS skip_weekend BOOLEAN DEFAULT TRUE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS daily_deadline_hour INT DEFAULT 17;
-- daily_deadline_hour: jam maksimal complete harian (default 17 = jam 5 sore WIB)

-- Step 2: Buat tabel activity_daily_completions (track completion per-intern per-aktivitas per-hari)
CREATE TABLE IF NOT EXISTS activity_daily_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  completion_notes TEXT,
  exp_awarded INT DEFAULT 20,
  bonus_exp_awarded INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, intern_id, completion_date)
);

ALTER TABLE activity_daily_completions ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

-- Step 3: Index untuk performance
CREATE INDEX IF NOT EXISTS idx_activity_daily_completions_activity ON activity_daily_completions(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_daily_completions_intern ON activity_daily_completions(intern_id);
CREATE INDEX IF NOT EXISTS idx_activity_daily_completions_date ON activity_daily_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_activities_range ON activities(start_date, end_date) WHERE is_recurring = TRUE;

-- Step 4: Verifikasi
SELECT 'MIGRATION ACTIVITY RECURRING SELESAI' as info
UNION ALL SELECT 'activities.start_date: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'start_date'
UNION ALL SELECT 'activities.end_date: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'end_date'
UNION ALL SELECT 'activities.is_recurring: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'is_recurring'
UNION ALL SELECT 'activities.skip_weekend: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'skip_weekend'
UNION ALL SELECT 'activities.daily_deadline_hour: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'daily_deadline_hour'
UNION ALL SELECT 'activity_daily_completions table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'activity_daily_completions';
