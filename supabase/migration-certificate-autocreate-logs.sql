-- ============================================================
-- MIGRATION: Tabel certificate_autocreate_logs
--
-- Tujuan: Audit trail untuk sertifikat yang di-auto-create oleh sistem
-- (cron job atau manual trigger admin) saat grace period magang selesai.
--
-- Idempotent — aman di-run ulang
-- ============================================================

CREATE TABLE IF NOT EXISTS certificate_autocreate_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL,
  trigger_type VARCHAR(20) NOT NULL, -- 'cron' | 'manual'
  trigger_source VARCHAR(100), -- 'vercel-cron' | 'admin:email@example.com' | dll
  reason TEXT, -- kenapa di-auto-create (mis: 'Grace period 7 hari selesai, admin belum terbitkan')
  total_exp_at_creation INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificate_autocreate_logs ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

CREATE INDEX IF NOT EXISTS idx_autocreate_logs_intern ON certificate_autocreate_logs(intern_id);
CREATE INDEX IF NOT EXISTS idx_autocreate_logs_created ON certificate_autocreate_logs(created_at DESC);

-- Verifikasi (query sederhana)
SELECT COUNT(*) AS autocreate_logs_table_exists
FROM information_schema.tables
WHERE table_name = 'certificate_autocreate_logs';
