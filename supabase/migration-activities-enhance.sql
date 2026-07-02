-- ============================================================
-- MIGRATION: Activities enhancement — archive, completion notes, intern-created
-- ============================================================

-- Add columns to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_by_intern BOOLEAN DEFAULT FALSE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Add completion_notes to activity_completions (for department-mode)
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Verifikasi
SELECT 'activities columns added' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'activities' AND column_name = 'is_archived'
);
