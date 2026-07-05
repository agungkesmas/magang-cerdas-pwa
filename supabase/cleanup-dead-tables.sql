-- ============================================================
-- CLEANUP: Drop dead/unused tables
-- Idempotent — aman di-run ulang
-- ============================================================
-- Tabel yang di-drop (sudah tidak dipakai di kode):
-- 1. Logbook — API logbook sudah dihapus, fitur diganti activities
-- 2. task_assignments — tidak di-query di mana-mana
-- 3. task_team_progress — tidak di-query di mana-mana
-- 4. Tasks — sudah diganti dengan activities (query dihapus dari API)
-- 5. task_completions — query dihapus, return empty array
--
-- CATATAN:
-- - Backup data sebelum run (kalau perlu)
-- - Tabel akan di-drop CASCADE (hapus relasi FK juga)
-- - Setelah drop, kode tidak akan error karena query sudah dihapus
-- ============================================================

-- Step 1: Drop tabel (urutan penting — drop child dulu)
DROP TABLE IF EXISTS task_completions CASCADE;
DROP TABLE IF EXISTS task_team_progress CASCADE;
DROP TABLE IF EXISTS task_assignments CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS Logbook CASCADE;

-- Step 2: Drop indexes terkait (otomatis ter-drop saat tabel di-drop,
-- tapi just in case)
DROP INDEX IF EXISTS idx_task_completions_intern;
DROP INDEX IF EXISTS idx_tasks;

-- Step 3: Verifikasi
SELECT 'CLEANUP DEAD TABLES SELESAI' as info
UNION ALL SELECT 'Logbook dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Logbook') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'tasks dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'task_assignments dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_assignments') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'task_completions dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_completions') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'task_team_progress dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_team_progress') THEN 'YES' ELSE 'NO' END);
