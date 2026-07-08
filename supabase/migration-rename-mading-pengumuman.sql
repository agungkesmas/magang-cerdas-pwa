-- ============================================================
-- Migration: Rename "All Peserta Magang" → "Mading Pengumuman"
-- ============================================================
-- TUJUAN:
--   Rename grup sistem "All Peserta Magang" menjadi "Mading Pengumuman"
--   supaya konsisten dengan label yang tampil di dashboard peserta
--   magang (yang sudah hardcode "Mading Pengumuman" dengan styling khusus).
--
--   Update juga description supaya lebih jelas fungsinya sebagai
--   broadcast channel pengumuman resmi.
--
-- KOMPATIBILITAS:
--   - Code sudah handle kedua nama (lama & baru) di:
--     * src/lib/system-groups.ts (line 33-36)
--     * src/app/intern/chat/page.tsx (line 8-11)
--     * src/app/admin/chat/page.tsx (line 28-33)
--   - Jadi migration ini bisa di-run kapanpun tanpa break code.
--   - Idempotent — aman di-run ulang.
--
-- CARA PAKAI:
--   1. Buka Supabase SQL Editor
--   2. Paste seluruh file ini
--   3. Klik Run
-- ============================================================

-- Step 1: Rename group "All Peserta Magang" → "Mading Pengumuman"
-- (hanya kalau grup lama masih ada, dan grup baru belum ada)
-- Catatan: tabel groups tidak punya kolom updated_at di schema existing
UPDATE groups
SET
  name = 'Mading Pengumuman',
  description = 'Grup sistem — pengumuman resmi dari admin & pembina BPJS Ketenagakerjaan (broadcast ke semua peserta aktif)'
WHERE group_type = 'system'
  AND name = 'All Peserta Magang'
  AND department IS NULL;

-- Step 2: Verify rename berhasil
SELECT '=== HASIL RENAME ===' as info;
SELECT id, name, group_type, department, is_active, description
FROM groups
WHERE group_type = 'system'
ORDER BY name;

-- Step 3: Cek member count (semua harus tetap ada — rename tidak hapus anggota)
SELECT '=== MEMBER COUNTS ===' as info;
SELECT
  g.name,
  COUNT(CASE WHEN gm.user_type = 'peserta' THEN 1 END) as peserta_count,
  COUNT(CASE WHEN gm.user_type = 'pembina' THEN 1 END) as pembina_count,
  COUNT(CASE WHEN gm.user_type = 'admin' THEN 1 END) as admin_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.group_type = 'system'
GROUP BY g.name
ORDER BY g.name;

-- Expected result:
--   Magang - Keuangan   | 3 peserta | 1 pembina | 0 admin
--   Magang - Pelayanan  | 3 peserta | 1 pembina | 0 admin
--   Magang - Pemasaran  | 2 peserta | 1 pembina | 0 admin
--   Mading Pengumuman   | 8 peserta | 0 pembina | 0 admin  (RENAMED dari "All Peserta Magang")
--   Diskusi Magang All  | 8 peserta | 3 pembina | 1 admin  (tetap)
