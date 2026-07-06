INSERT INTO groups (name, description, group_type, department, created_by_type, created_by_name, is_active)
SELECT 'Diskusi Magang All', 'Grup diskusi terbuka — semua peserta magang & pembina aktif (cross-department, seperti WA grup all)', 'system', NULL, 'system', 'SYSTEM', true
WHERE NOT EXISTS (SELECT 1 FROM groups WHERE group_type = 'system' AND name = 'Diskusi Magang All');

INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id, joined_at)
SELECT g.id, 'peserta', i.id, 'member', 'system', NULL, NOW()
FROM interns i
CROSS JOIN groups g
WHERE g.group_type = 'system' AND g.name = 'Diskusi Magang All'
  AND i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = g.id AND gm.user_type = 'peserta' AND gm.user_id = i.id
  );

INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id, joined_at)
SELECT g.id, 'pembina', p.id, 'member', 'system', NULL, NOW()
FROM pembina_magang p
CROSS JOIN groups g
WHERE g.group_type = 'system' AND g.name = 'Diskusi Magang All'
  AND p.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = g.id AND gm.user_type = 'pembina' AND gm.user_id = p.id
  );

INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, added_by_id, joined_at)
SELECT g.id, 'admin', a.id, 'group_admin', 'system', NULL, NOW()
FROM admins a
CROSS JOIN groups g
WHERE g.group_type = 'system' AND g.name = 'Diskusi Magang All'
  AND NOT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = g.id AND gm.user_type = 'admin' AND gm.user_id = a.id
  );

SELECT g.name,
  COUNT(CASE WHEN gm.user_type = 'peserta' THEN 1 END) as peserta_count,
  COUNT(CASE WHEN gm.user_type = 'pembina' THEN 1 END) as pembina_count,
  COUNT(CASE WHEN gm.user_type = 'admin' THEN 1 END) as admin_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.name = 'Diskusi Magang All'
GROUP BY g.name;
