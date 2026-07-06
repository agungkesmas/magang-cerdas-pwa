/* ============================================================
   MIGRATION: Activity Bonus XP — Gift dari pembina ke aktivitas self-added peserta
   Idempotent — aman di-run ulang

   Tujuan:
   1. Buat tabel activity_bonus_logs (paralel dengan xp_bonus_logs untuk quest)
      - Mencatat bonus XP yang pembina berikan ke aktivitas yang dibuat peserta sendiri
      - UNIQUE(activity_completion_id): 1 bonus per completion (anti double-award)
   2. Tambah kolom bonus_xp & bonus_note ke activity_completions (untuk display cepat)
   ============================================================ */

/* ============================================================
   A. Buat tabel activity_bonus_logs
   ============================================================ */
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
/* No public policy — all access via service role in API routes */

CREATE INDEX IF NOT EXISTS idx_activity_bonus_logs_intern ON activity_bonus_logs(intern_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bonus_logs_pembina ON activity_bonus_logs(pembina_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bonus_logs_activity ON activity_bonus_logs(activity_id);

/* ============================================================
   B. Tambah kolom bonus_xp & bonus_note ke activity_completions
   Untuk display cepat di UI tanpa perlu JOIN ke activity_bonus_logs
   ============================================================ */
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_xp INT DEFAULT 0;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_note TEXT;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_by_pembina_id UUID REFERENCES pembina_magang(id) ON DELETE SET NULL;
ALTER TABLE activity_completions ADD COLUMN IF NOT EXISTS bonus_at TIMESTAMPTZ;

/* ============================================================
   C. VERIFIKASI
   ============================================================ */
SELECT 'MIGRATION ACTIVITY BONUS LOGS SELESAI' as info
UNION ALL SELECT 'activity_bonus_logs table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'activity_bonus_logs'
UNION ALL SELECT 'UNIQUE constraint on activity_completion_id: ' || COUNT(*)::text FROM pg_constraint WHERE conname = 'activity_bonus_logs_activity_completion_id_key'
UNION ALL SELECT 'activity_completions bonus_xp column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activity_completions' AND column_name = 'bonus_xp';
