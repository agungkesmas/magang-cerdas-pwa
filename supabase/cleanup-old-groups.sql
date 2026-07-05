-- ============================================================
-- Cleanup: Hapus grup lama (non-system) yang sudah diganti system groups
-- ============================================================
-- Grup yang dihapus:
-- 1. "Grup Magang Keuangan Q3 2026"
-- 2. "Grup Magang Pelayanan Q3 2026"
-- 3. "Grup Magang Pemasaran Q3 2026"
--
-- group_members akan auto-delete (ON DELETE CASCADE)
-- chat_messages akan auto-delete (FK ON DELETE CASCADE)
--
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Hapus grup lama (bukan system)
DELETE FROM groups
WHERE group_type != 'system'
  AND name LIKE 'Grup Magang %Q3 2026%';

-- Verify: yang tersisa harusnya hanya system groups
SELECT 'Grup tersisa:' as info;
SELECT id, name, group_type, department, is_active
FROM groups
ORDER BY group_type, name;

-- Verify: tidak ada group_members orphan
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
