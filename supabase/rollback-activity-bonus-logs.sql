/* ============================================================
   ROLLBACK: Activity Bonus Logs
   HANYA jalankan jika perlu undo migration-activity-bonus-logs.sql
   WARNING: akan kehilangan semua bonus log aktivitas
   ============================================================ */

DROP INDEX IF EXISTS idx_activity_bonus_logs_intern;
DROP INDEX IF EXISTS idx_activity_bonus_logs_pembina;
DROP INDEX IF EXISTS idx_activity_bonus_logs_activity;

DROP TABLE IF EXISTS activity_bonus_logs;

ALTER TABLE activity_completions DROP COLUMN IF EXISTS bonus_at;
ALTER TABLE activity_completions DROP COLUMN IF EXISTS bonus_by_pembina_id;
ALTER TABLE activity_completions DROP COLUMN IF EXISTS bonus_note;
ALTER TABLE activity_completions DROP COLUMN IF EXISTS bonus_xp;

SELECT 'ROLLBACK ACTIVITY BONUS LOGS SELESAI' as info;
