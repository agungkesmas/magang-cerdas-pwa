-- ============================================================
-- CLEANUP: Data lama yang tidak relevan untuk Broadcast Center + Riwayat Aktivitas
-- Strategi: HANYA hapus data yatim piatu (orphaned). Tidak hapus data aktif.
-- Idempotent — aman di-run ulang.
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- STEP 1: Cleanup activity_completions yang point ke activities yg sudah dihapus
-- (sudah ON DELETE CASCADE, tapi jaga-jaga kalau ada yang lewat)
-- ============================================================
DELETE FROM activity_completions
WHERE activity_id NOT IN (SELECT id FROM activities);

-- ============================================================
-- STEP 2: Cleanup activity_daily_completions yang point ke activities yg sudah dihapus
-- ============================================================
DELETE FROM activity_daily_completions
WHERE activity_id NOT IN (SELECT id FROM activities);

-- ============================================================
-- STEP 3: Cleanup quest_logs yang point ke activities (quest) yg sudah dihapus
-- (quest_logs.quest_id references activities.id, bukan tabel quests terpisah)
-- ON DELETE CASCADE seharusnya sudah handle, tapi jaga-jaga
-- ============================================================
DELETE FROM quest_logs
WHERE quest_id NOT IN (SELECT id FROM activities);

-- ============================================================
-- STEP 4: Cleanup group_members yang point ke groups/interns/pembina yg sudah dihapus
-- Hanya untuk grup non-sistem (sistem di-handle oleh sync logic)
-- ============================================================
DELETE FROM group_members
WHERE group_id NOT IN (SELECT id FROM groups);

DELETE FROM group_members
WHERE user_type = 'peserta' AND user_id NOT IN (SELECT id FROM interns);

DELETE FROM group_members
WHERE user_type = 'pembina' AND user_id NOT IN (SELECT id FROM pembina_magang);

-- ============================================================
-- STEP 5: Cleanup chat_messages yang point ke groups/interns yg sudah dihapus
-- (seharusnya sudah CASCADE, tapi jaga-jaga)
-- ============================================================
DELETE FROM chat_messages
WHERE group_id NOT IN (SELECT id FROM groups);

-- ============================================================
-- STEP 6: Statistik ringkasan (UNTUK MONITORING SAJA — tidak hapus apa pun)
-- Lihat distribusi data untuk konfirmasi tidak ada yang aneh
-- ============================================================
SELECT '=== RINGKASAN DATA ===' as info;

SELECT 'activities total' as label, COUNT(*)::text as value FROM activities
UNION ALL
SELECT 'activity_completions total', COUNT(*)::text FROM activity_completions
UNION ALL
SELECT 'activity_daily_completions total', COUNT(*)::text FROM activity_daily_completions
UNION ALL
SELECT 'attendance total', COUNT(*)::text FROM attendance
UNION ALL
SELECT 'chat_messages total', COUNT(*)::text FROM chat_messages
UNION ALL
SELECT 'groups total', COUNT(*)::text FROM groups
UNION ALL
SELECT 'group_members total', COUNT(*)::text FROM group_members
UNION ALL
SELECT 'interns (active)', COUNT(*)::text FROM interns WHERE is_active = true
UNION ALL
SELECT 'interns (archived)', COUNT(*)::text FROM interns WHERE is_active = false
UNION ALL
SELECT 'certificates total', COUNT(*)::text FROM "Certificates"
UNION ALL
SELECT 'quest_logs total', COUNT(*)::text FROM quest_logs
UNION ALL
SELECT 'leave_requests total', COUNT(*)::text FROM leave_requests;

-- ============================================================
-- STEP 7: Cek grup sistem yang seharusnya ada (auto-sync marker)
-- Jika ada yang hilang, jalankan migration-system-groups.sql lagi
-- ============================================================
SELECT '=== SYSTEM GROUPS ===' as info;
SELECT id, name, group_type, department, is_active
FROM groups
WHERE group_type = 'system'
ORDER BY department NULLS FIRST;

-- ============================================================
-- STEP 8: Cek activities dengan target individual (intern_id NOT NULL)
-- Ini data lama — admin dulu bisa assign ke 1 peserta (sekarang sudah dipindah ke pembina)
-- TIDAK DIHAPUS — biarkan sebagai history untuk timeline peserta
-- Hanya ditandai sebagai is_archived=true kalau ada kolomnya
-- ============================================================
SELECT '=== LEGACY INDIVIDUAL ACTIVITIES (admin-assigned) ===' as info;
SELECT
  COUNT(*) as total_legacy_individual,
  COUNT(DISTINCT intern_id) as unique_interns,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM activities
WHERE intern_id IS NOT NULL;

-- ============================================================
-- NOTE: Tabel activities TIDAK dihapus/dimodifikasi struktur
-- - data completion-nya berguna untuk timeline peserta
-- - halaman /admin/activities sudah di-repurpose jadi "Riwayat Aktivitas Peserta"
-- - API /api/activities/* tetap jalan untuk peserta submit tugas harian & pembina assign
-- ============================================================

SELECT 'CLEANUP SELESAI — Tidak ada data aktif yang dihapus' as info;
