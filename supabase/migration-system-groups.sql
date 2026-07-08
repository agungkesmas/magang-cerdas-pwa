-- ============================================================
-- Migration: System Groups (All + Per Department)
-- ============================================================
-- TUJUAN: Create 4 system groups yang selalu ada:
-- 1. "Mading Pengumuman" — berisi semua peserta aktif (broadcast channel)
-- 2. "Magang - Pelayanan" — peserta departemen Pelayanan
-- 3. "Magang - Pemasaran" — peserta departemen Pemasaran
-- 4. "Magang - Keuangan" — peserta departemen Keuangan
--
-- Grup sistem TIDAK bisa di-arsip atau dihapus.
-- Peserta masuk-keluar sendiri sesuai umur magang (auto-sync di API).
--
-- CARA PAKAI:
-- 1. Buka Supabase SQL Editor
-- 2. Paste seluruh file ini
-- 3. Klik Run
-- ============================================================

-- Step 1: Insert 4 system groups (idempotent — tidak duplikat kalau di-run ulang)
INSERT INTO groups (name, description, group_type, department, created_by_type, created_by_name, is_active)
SELECT * FROM (VALUES
  ('Mading Pengumuman', 'Grup sistem — pengumuman resmi dari admin & pembina BPJS Ketenagakerjaan (broadcast ke semua peserta aktif)', 'system', NULL, 'system', 'SYSTEM', true),
  ('Magang - Pelayanan', 'Grup sistem — peserta magang departemen Pelayanan (auto-managed)', 'system', 'Pelayanan', 'system', 'SYSTEM', true),
  ('Magang - Pemasaran', 'Grup sistem — peserta magang departemen Pemasaran (auto-managed)', 'system', 'Pemasaran', 'system', 'SYSTEM', true),
  ('Magang - Keuangan', 'Grup sistem — peserta magang departemen Keuangan (auto-managed)', 'system', 'Keuangan', 'system', 'SYSTEM', true)
) AS v(name, description, group_type, department, created_by_type, created_by_name, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM groups WHERE group_type = 'system' AND name = v.name
);

-- Step 2: Sync existing active interns to system groups
-- Add to "Mading Pengumuman"
INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id, joined_at)
SELECT g.id, 'peserta', i.id, 'member', 'system', NULL, NOW()
FROM interns i
CROSS JOIN groups g
WHERE g.group_type = 'system' AND g.name = 'Mading Pengumuman'
  AND i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = g.id AND gm.user_type = 'peserta' AND gm.user_id = i.id
  );

-- Add to department groups
INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id, joined_at)
SELECT g.id, 'peserta', i.id, 'member', 'system', NULL, NOW()
FROM interns i
CROSS JOIN groups g
WHERE g.group_type = 'system' AND g.department = i.department
  AND i.is_active = true
  AND i.department IN ('Pelayanan', 'Pemasaran', 'Keuangan')
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = g.id AND gm.user_type = 'peserta' AND gm.user_id = i.id
  );

-- Step 3: Sync pembina to department system groups
INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id, joined_at)
SELECT g.id, 'pembina', p.id, 'member', 'system', NULL, NOW()
FROM pembina_magang p
CROSS JOIN groups g
WHERE g.group_type = 'system' AND g.department = p.department
  AND p.is_active = true
  AND p.department IN ('Pelayanan', 'Pemasaran', 'Keuangan')
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = g.id AND gm.user_type = 'pembina' AND gm.user_id = p.id
  );

-- Step 4: Verify
SELECT 'System groups created:' as info;
SELECT id, name, group_type, department, is_active FROM groups WHERE group_type = 'system' ORDER BY name;

SELECT 'Member counts:' as info;
SELECT
  g.name,
  COUNT(CASE WHEN gm.user_type = 'peserta' THEN 1 END) as peserta_count,
  COUNT(CASE WHEN gm.user_type = 'pembina' THEN 1 END) as pembina_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.group_type = 'system'
GROUP BY g.name
ORDER BY g.name;
