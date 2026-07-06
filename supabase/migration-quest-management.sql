/* ============================================================
   MIGRATION: Quest Management (Edit / Archive / Delete / Restore / Force-Cancel)
   Idempotent — aman di-run ulang
   Rollback: supabase/rollback-quest-management.sql

   Tujuan:
   1. Tambah kolom archived_at di activities untuk audit trail kapan quest di-archive
   2. Tambah kolom edited_at & edited_by untuk audit trail kapan quest di-edit
   3. Tabel quest_audit_logs: log semua aksi edit/archive/delete/restore/force-cancel
   ============================================================ */

/* ============================================================
   A. EXTEND tabel activities (kolom audit untuk Quest)
   ============================================================ */
ALTER TABLE activities ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS archived_by_type VARCHAR(20);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS archived_by_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_by_type VARCHAR(20);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_by_id UUID;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_activities_archived_at ON activities(archived_at) WHERE archived_at IS NOT NULL;

/* ============================================================
   B. TABEL: quest_audit_logs (Audit trail semua aksi manajemen quest)
   Action types: 'edit' | 'archive' | 'restore' | 'delete' | 'force_cancel'
   ============================================================ */
CREATE TABLE IF NOT EXISTS quest_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID NOT NULL,
  quest_title TEXT,
  action VARCHAR(30) NOT NULL CHECK (action IN ('edit', 'archive', 'restore', 'delete', 'force_cancel')),
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('pembina', 'admin')),
  actor_id UUID NOT NULL,
  actor_name VARCHAR(255),
  changes JSONB,
  affected_intern_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quest_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quest_audit_logs_quest ON quest_audit_logs(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_audit_logs_actor ON quest_audit_logs(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_quest_audit_logs_action ON quest_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_quest_audit_logs_created ON quest_audit_logs(created_at DESC);

/* ============================================================
   C. VERIFIKASI
   ============================================================ */
SELECT 'MIGRATION QUEST MANAGEMENT SELESAI' as info
UNION ALL SELECT 'quest_audit_logs: ' || COUNT(*)::text FROM quest_audit_logs
UNION ALL SELECT 'activities with archived_at not null: ' || COUNT(*)::text FROM activities WHERE archived_at IS NOT NULL;
