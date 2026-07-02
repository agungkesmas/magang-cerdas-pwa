-- ============================================================
-- ROLLBACK PHASE 1: Chat Group + Quest + Dashboard Pembina
-- Jalankan di Supabase SQL Editor untuk rollback
-- ============================================================
-- Catatan: data quest_logs & chat_messages akan dihapus
-- Aktivitas existing (is_quest=false) TIDAK terpengaruh
-- ============================================================

-- Step 1: Drop tabel baru
DROP TABLE IF EXISTS quest_logs CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS pembina_magang CASCADE;

-- Step 2: Drop FK constraints dari activities
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_created_by_pembina_fkey;
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_group_fkey;

-- Step 3: Drop kolom baru dari activities
ALTER TABLE activities DROP COLUMN IF EXISTS is_quest;
ALTER TABLE activities DROP COLUMN IF EXISTS group_id;
ALTER TABLE activities DROP COLUMN IF EXISTS created_by_pembina_id;
ALTER TABLE activities DROP COLUMN IF EXISTS xp_reward;
ALTER TABLE activities DROP COLUMN IF EXISTS max_slots;
ALTER TABLE activities DROP COLUMN IF EXISTS current_slots_taken;

-- Step 4: Drop indexes
DROP INDEX IF EXISTS idx_activities_is_quest;
DROP INDEX IF EXISTS idx_activities_group_id;
DROP INDEX IF EXISTS idx_activities_created_by_pembina;
DROP INDEX IF EXISTS idx_groups_active;
DROP INDEX IF EXISTS idx_group_members_group;
DROP INDEX IF EXISTS idx_group_members_user;
DROP INDEX IF EXISTS idx_chat_messages_group;
DROP INDEX IF EXISTS idx_chat_messages_quest;
DROP INDEX IF EXISTS idx_quest_logs_quest;
DROP INDEX IF EXISTS idx_quest_logs_intern;
DROP INDEX IF EXISTS idx_quest_logs_status;

-- Step 5: Verifikasi
SELECT '=== ROLLBACK PHASE 1 SELESAI ===' as info
UNION ALL SELECT 'quest_logs dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quest_logs') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'pembina_magang dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pembina_magang') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'activities.is_quest dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'is_quest') THEN 'YES' ELSE 'NO' END);

-- ============================================================
-- CATATAN ROLLBACK KODE:
-- git revert <commit-hash> untuk rollback kode
-- ============================================================
