-- ============================================================
-- Cleanup: Hapus grup lama (non-system) — FIX constraint error
-- ============================================================
-- Problem: activities_target_check mencegah group_id = NULL
-- kalau intern_id dan department juga NULL.
-- Solution: DELETE activities yang ter-link ke grup lama
-- (quest activities yang group-nya akan dihapus)
-- ============================================================

-- Step 1: Hapus activity_completions untuk activities di grup lama
DELETE FROM activity_completions
WHERE activity_id IN (
  SELECT id FROM activities
  WHERE group_id IN (
    SELECT id FROM groups
    WHERE group_type != 'system'
      AND name LIKE 'Grup Magang %Q3 2026%'
  )
);

-- Step 2: Hapus quest_logs untuk activities di grup lama
DELETE FROM quest_logs
WHERE quest_id IN (
  SELECT id FROM activities
  WHERE group_id IN (
    SELECT id FROM groups
    WHERE group_type != 'system'
      AND name LIKE 'Grup Magang %Q3 2026%'
  )
);

-- Step 3: Hapus activities yang ter-link ke grup lama
DELETE FROM activities
WHERE group_id IN (
  SELECT id FROM groups
  WHERE group_type != 'system'
    AND name LIKE 'Grup Magang %Q3 2026%'
);

-- Step 4: Hapus chat_messages dari grup lama
DELETE FROM chat_messages
WHERE group_id IN (
  SELECT id FROM groups
  WHERE group_type != 'system'
    AND name LIKE 'Grup Magang %Q3 2026%'
);

-- Step 5: Hapus group_members dari grup lama
DELETE FROM group_members
WHERE group_id IN (
  SELECT id FROM groups
  WHERE group_type != 'system'
    AND name LIKE 'Grup Magang %Q3 2026%'
);

-- Step 6: Hapus grup lama
DELETE FROM groups
WHERE group_type != 'system'
  AND name LIKE 'Grup Magang %Q3 2026%';

-- Step 7: Verify — yang tersisa harusnya hanya system groups
SELECT 'Grup tersisa:' as info;
SELECT id, name, group_type, department, is_active
FROM groups
ORDER BY group_type, name;

-- Step 8: Verify member count per grup
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
