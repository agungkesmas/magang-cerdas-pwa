-- ============================================================
-- ROLLBACK: Aktivitas Recurring Harian
-- Jalankan di Supabase SQL Editor untuk MENGEMBALIKAN ke state sebelum migration
-- ============================================================
-- PERHATIAN:
-- - Ini akan MENGHAPUS semua data completion harian (activity_daily_completions)
-- - Aktivitas yang sudah dibuat dengan is_recurring = TRUE akan di-reset ke FALSE
-- - Kolom range (start_date, end_date) akan di-drop dari activities
-- - Aktivitas existing (mode lama) TIDAK terpengaruh
-- ============================================================

-- Step 1: Drop tabel activity_daily_completions (HAPUS data completion harian)
DROP TABLE IF EXISTS activity_daily_completions CASCADE;

-- Step 2: Reset activities yang is_recurring = TRUE kembali ke FALSE
UPDATE activities SET is_recurring = FALSE WHERE is_recurring = TRUE;

-- Step 3: Drop kolom-kolom baru dari activities
ALTER TABLE activities DROP COLUMN IF EXISTS start_date;
ALTER TABLE activities DROP COLUMN IF EXISTS end_date;
ALTER TABLE activities DROP COLUMN IF EXISTS is_recurring;
ALTER TABLE activities DROP COLUMN IF EXISTS skip_weekend;
ALTER TABLE activities DROP COLUMN IF EXISTS daily_deadline_hour;

-- Step 4: Drop indexes yang terkait (otomatis ter-drop saat kolom di-drop, tapi just in case)
DROP INDEX IF EXISTS idx_activities_range;
DROP INDEX IF EXISTS idx_activity_daily_completions_activity;
DROP INDEX IF EXISTS idx_activity_daily_completions_intern;
DROP INDEX IF EXISTS idx_activity_daily_completions_date;

-- Step 5: Verifikasi
SELECT '=== ROLLBACK ACTIVITY RECURRING SELESAI ===' as info
UNION ALL SELECT 'activity_daily_completions dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_daily_completions') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'activities.start_date dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'start_date') THEN 'YES' ELSE 'NO' END)
UNION ALL SELECT 'activities.is_recurring dropped: ' || (CASE WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'is_recurring') THEN 'YES' ELSE 'NO' END);

-- ============================================================
-- CATATAN ROLLBACK KODE:
-- Setelah run SQL ini, juga perlu revert kode di commit terakhir:
--   git revert <commit-hash>
-- Atau manual hapus perubahan di:
--   - src/app/api/activities/create/route.ts
--   - src/app/api/activities/list/route.ts
--   - src/app/api/activities/complete/route.ts
--   - src/app/api/activities/history/route.ts
--   - src/app/admin/activities/page.tsx
--   - src/app/intern/activities/page.tsx
-- ============================================================
