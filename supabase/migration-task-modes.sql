-- ============================================================
-- MIGRATION: Task Modes (Individual / Assigned / Team) + Bug Fixes
-- Jalankan di Supabase SQL Editor JIKA schema.sql versi lama sudah di-run
-- ============================================================

-- ============================================================
-- Step 1: Tambah kolom baru ke tabel tasks
-- ============================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'individual';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;

-- Constraint: mode harus salah satu dari 3 nilai
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'tasks_mode_check' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT tasks_mode_check
      CHECK (mode IN ('individual', 'assigned', 'team'));
  END IF;
END $$;

-- Backfill existing tasks ke mode 'individual' (default)
UPDATE tasks SET mode = 'individual' WHERE mode IS NULL;

-- ============================================================
-- Step 2: Tabel task_assignments (untuk mode 'assigned' & 'team')
-- ============================================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, intern_id)
);

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
-- No public policy — write/read via service role only

-- ============================================================
-- Step 3: Tabel task_team_progress (shared progress untuk mode 'team')
-- 1 task tim → 1 progress bar bersama
-- UNIQUE(task_id, chunk_index) → 1 chunk hanya bisa di-complete 1x oleh siapapun di tim
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
-- Step 4: Index untuk performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tasks_mode ON tasks(mode);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_intern ON task_assignments(intern_id);
CREATE INDEX IF NOT EXISTS idx_task_team_progress_task ON task_team_progress(task_id);

-- ============================================================
-- Step 5: Update existing tasks.mode (yang masih NULL setelah kolom ditambah)
-- ============================================================
UPDATE tasks SET mode = 'individual' WHERE mode IS NULL OR mode = '';

-- ============================================================
-- Step 6: Verifikasi
-- ============================================================
SELECT 'tasks columns: ' || string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tasks'
UNION ALL
SELECT 'task_assignments count: ' || COUNT(*)::text FROM task_assignments
UNION ALL
SELECT 'task_team_progress count: ' || COUNT(*)::text FROM task_team_progress;
