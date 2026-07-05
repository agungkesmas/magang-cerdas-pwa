-- ============================================================
-- MIGRATION: Tabel xp_bonus_logs — Bonus XP dari pembina ke peserta
-- Konsep: Setelah peserta submit quest, pembina bisa kasih bonus XP
--         jika kerjaannya berat/luar biasa. 1 bonus per quest_log (anti abuse).
--         Sistem kirim pesan otomatis ke chat grup untuk motivasi.
--
-- Idempotent — aman di-run ulang
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Buat tabel xp_bonus_logs
CREATE TABLE IF NOT EXISTS xp_bonus_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_log_id UUID NOT NULL REFERENCES quest_logs(id) ON DELETE CASCADE,
  -- quest_log_id UNIQUE: 1 bonus per quest log (anti double-award)
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  pembina_id UUID NOT NULL REFERENCES pembina_magang(id) ON DELETE SET NULL,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  bonus_xp INT NOT NULL CHECK (bonus_xp >= 1 AND bonus_xp <= 100),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(quest_log_id)
);

ALTER TABLE xp_bonus_logs ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

-- Step 2: Index untuk performance
CREATE INDEX IF NOT EXISTS idx_xp_bonus_logs_intern ON xp_bonus_logs(intern_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_bonus_logs_pembina ON xp_bonus_logs(pembina_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_bonus_logs_quest ON xp_bonus_logs(quest_id);

-- Step 3: Verifikasi
SELECT 'MIGRATION XP_BONUS_LOGS SELESAI' as info
UNION ALL SELECT 'xp_bonus_logs table: ' || COUNT(*)::text FROM information_schema.tables WHERE table_name = 'xp_bonus_logs'
UNION ALL SELECT 'UNIQUE constraint on quest_log_id: ' || COUNT(*)::text FROM pg_constraint WHERE conname = 'xp_bonus_logs_quest_log_id_key';
