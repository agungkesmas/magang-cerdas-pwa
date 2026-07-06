-- ============================================================
-- ROLLBACK: Quest Management
-- HANYA jalankan jika perlu undo migration-quest-management.sql
-- WARNING: akan kehilangan semua audit log quest
-- ============================================================

DROP INDEX IF EXISTS idx_activities_archived_at;
DROP INDEX IF EXISTS idx_quest_audit_logs_quest;
DROP INDEX IF EXISTS idx_quest_audit_logs_actor;
DROP INDEX IF EXISTS idx_quest_audit_logs_action;
DROP INDEX IF EXISTS idx_quest_audit_logs_created;

DROP TABLE IF EXISTS quest_audit_logs;

ALTER TABLE activities DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE activities DROP COLUMN IF EXISTS edited_by_id;
ALTER TABLE activities DROP COLUMN IF EXISTS edited_by_type;
ALTER TABLE activities DROP COLUMN IF EXISTS edited_at;
ALTER TABLE activities DROP COLUMN IF EXISTS archived_by_id;
ALTER TABLE activities DROP COLUMN IF EXISTS archived_by_type;
ALTER TABLE activities DROP COLUMN IF EXISTS archived_at;

SELECT 'ROLLBACK QUEST MANAGEMENT SELESAI' as info;
