CREATE TABLE IF NOT EXISTS quest_daily_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  submission_notes TEXT,
  xp_awarded INT DEFAULT 20,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quest_id, intern_id, completion_date)
);

ALTER TABLE quest_daily_completions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qdc_intern ON quest_daily_completions(intern_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_qdc_quest ON quest_daily_completions(quest_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_qdc_date ON quest_daily_completions(completion_date DESC);

CREATE TABLE IF NOT EXISTS quest_daily_bonus_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_daily_completion_id UUID NOT NULL REFERENCES quest_daily_completions(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  pembina_id UUID NOT NULL REFERENCES pembina_magang(id) ON DELETE SET NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  completion_date DATE NOT NULL,
  bonus_xp INT NOT NULL CHECK (bonus_xp >= 1 AND bonus_xp <= 100),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quest_daily_completion_id)
);

ALTER TABLE quest_daily_bonus_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_qdbl_intern ON quest_daily_bonus_logs(intern_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qdbl_pembina ON quest_daily_bonus_logs(pembina_id, created_at DESC);

INSERT INTO quest_daily_completions (quest_id, intern_id, group_id, completion_date, submission_notes, xp_awarded, submitted_at)
SELECT ql.quest_id, ql.intern_id, ql.group_id, DATE(ql.submitted_at), ql.submission_notes, ql.xp_awarded, ql.submitted_at
FROM quest_logs ql
JOIN activities a ON a.id = ql.quest_id
WHERE a.is_quest = true
  AND a.is_recurring = true
  AND ql.status = 'completed'
  AND ql.submitted_at IS NOT NULL
ON CONFLICT (quest_id, intern_id, completion_date) DO NOTHING;

UPDATE quest_logs ql
SET status = 'available', started_at = NULL, submitted_at = NULL, submission_notes = NULL, xp_awarded = 0
FROM activities a
WHERE ql.quest_id = a.id
  AND a.is_quest = true
  AND a.is_recurring = true
  AND ql.status = 'completed'
  AND EXISTS (
    SELECT 1 FROM quest_daily_completions qdc
    WHERE qdc.quest_id = ql.quest_id
      AND qdc.intern_id = ql.intern_id
      AND qdc.completion_date = DATE(ql.submitted_at)
  );

SELECT 'MIGRATION QUEST DAILY COMPLETIONS SELESAI' as info
UNION ALL SELECT 'quest_daily_completions: ' || COUNT(*)::text FROM quest_daily_completions
UNION ALL SELECT 'quest_daily_bonus_logs: ' || COUNT(*)::text FROM quest_daily_bonus_logs
UNION ALL SELECT 'quest_logs recurring reset to available: ' || COUNT(*)::text FROM quest_logs ql JOIN activities a ON a.id = ql.quest_id WHERE a.is_recurring = true AND ql.status = 'available';
