-- ============================================================
-- Cleanup: Hapus grup lama (non-system) yang sudah diganti system groups
-- ============================================================
-- Grup yang dihapus:
-- 1. "Grup Magang Keuangan Q3 2026"
-- 2. "Grup Magang Pelayanan Q3 2026"
-- 3. "Grup Magang Pemasaran Q3 2026"
--
-- FIX: activities_target_check constraint mencegah group_id = NULL
-- kalau intern_id dan department juga NULL. Jadi kita set activities
-- ke archived dulu sebelum delete grup.
-- ============================================================

-- Step 1: Archive aktivitas yang ter-link ke grup lama
-- (set group_id = null + is_archived = true supaya tidak violate constraint)
UPDATE activities
SET group_id = NULL, is_archived = true, is_active = false
WHERE group_id IN (
  SELECT id FROM groups
  WHERE group_type != 'system'
    AND name LIKE 'Grup Magang %Q3 2026%'
);

-- Step 2: Hapus group_members dari grup lama
DELETE FROM group_members
WHERE group_id IN (
  SELECT id FROM groups
  WHERE group_type != 'system'
    AND name LIKE 'Grup Magang %Q3 2026%'
);

-- Step 3: Hapus chat_messages dari grup lama
DELETE FROM chat_messages
WHERE group_id IN (
  SELECT id FROM groups
  WHERE group_type != 'system'
    AND name LIKE 'Grup Magang %Q3 2026%'
);

-- Step 4: Hapus grup lama
DELETE FROM groups
WHERE group_type != 'system'
  AND name LIKE 'Grup Magang %Q3 2026%';

-- Step 5: Verify — yang tersisa harusnya hanya system groups
SELECT 'Grup tersisa:' as info;
SELECT id, name, group_type, department, is_active
FROM groups
ORDER BY group_type, name;

-- Step 6: Verify member count per grup
SELECT 'Member count per grup:' as info;
SELECT
  g.name,
  g.group_type,
  COUNT(CASE WHEN gm.user_type = 'peserta' THEN 1 END) as peserta_count,
  COUNT(CASE WHEN gm.user_type = 'pembina' THEN 1 END) as pembina_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
GROUP BY g.name, g.group_type
ORDER BY g.group_type, g.name;
