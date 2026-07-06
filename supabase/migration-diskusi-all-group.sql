DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM groups WHERE name = 'Diskusi Magang All' AND group_type = 'system') THEN
    INSERT INTO groups (name, description, group_type, department, created_by_type, created_by_name, is_active)
    VALUES ('Diskusi Magang All', 'Grup diskusi cross-department', 'system', NULL, 'system', 'SYSTEM', true);
  END IF;
END $$;

INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, joined_at)
SELECT g.id, 'peserta', i.id, 'member', 'system', NOW()
FROM interns i
CROSS JOIN groups g
WHERE g.name = 'Diskusi Magang All' AND g.group_type = 'system'
  AND i.is_active = true
ON CONFLICT (group_id, user_type, user_id) DO NOTHING;

INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, joined_at)
SELECT g.id, 'pembina', p.id, 'member', 'system', NOW()
FROM pembina_magang p
CROSS JOIN groups g
WHERE g.name = 'Diskusi Magang All' AND g.group_type = 'system'
  AND p.is_active = true
ON CONFLICT (group_id, user_type, user_id) DO NOTHING;

INSERT INTO group_members (group_id, user_type, user_id, role, added_by_type, joined_at)
SELECT g.id, 'admin', a.id, 'group_admin', 'system', NOW()
FROM admins a
CROSS JOIN groups g
WHERE g.name = 'Diskusi Magang All' AND g.group_type = 'system'
ON CONFLICT (group_id, user_type, user_id) DO NOTHING;

SELECT g.name,
  COUNT(CASE WHEN gm.user_type = 'peserta' THEN 1 END) as peserta_count,
  COUNT(CASE WHEN gm.user_type = 'pembina' THEN 1 END) as pembina_count,
  COUNT(CASE WHEN gm.user_type = 'admin' THEN 1 END) as admin_count
FROM groups g
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.name = 'Diskusi Magang All'
GROUP BY g.name;
