CREATE TABLE IF NOT EXISTS activity_bonus_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_completion_id UUID NOT NULL REFERENCES activity_completions(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  pembina_id UUID NOT NULL REFERENCES pembina_magang(id) ON DELETE SET NULL,
  bonus_xp INT NOT NULL CHECK (bonus_xp >= 1 AND bonus_xp <= 100),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_completion_id)
);

ALTER TABLE activity_bonus_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_bonus_logs_intern ON activity_bonus_logs(intern_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bonus_logs_pembina ON activity_bonus_logs(pembina_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bonus_logs_activity ON activity_bonus_logs(activity_id);

ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_xp INT DEFAULT 0;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_note TEXT;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_by_pembina_id UUID REFERENCES pembina_magang(id) ON DELETE SET NULL;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_at TIMESTAMPTZ;

SELECT 'MIGRATION ACTIVITY BONUS LOGS SELESAI' as info
UNION ALL SELECT 'activity_bonus_logs table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'activity_bonus_logs'
UNION ALL SELECT 'activity_completions bonus_xp column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activity_completions' AND column_name = 'bonus_xp';
