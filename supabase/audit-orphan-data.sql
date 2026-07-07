SELECT 'ORPHAN QUEST_LOGS (quest_id tidak ada di activities)' as check_name, COUNT(*) as count
FROM quest_logs ql
LEFT JOIN activities a ON a.id = ql.quest_id
WHERE a.id IS NULL;

SELECT 'ORPHAN ACTIVITY_COMPLETIONS (activity_id tidak ada)' as check_name, COUNT(*) as count
FROM activity_completions ac
LEFT JOIN activities a ON a.id = ac.activity_id
WHERE a.id IS NULL;

SELECT 'ORPHAN CHAT_MESSAGES quest_id (quest tidak ada)' as check_name, COUNT(*) as count
FROM chat_messages cm
LEFT JOIN activities a ON a.id = cm.quest_id
WHERE cm.quest_id IS NOT NULL AND a.id IS NULL;

SELECT 'ORPHAN GROUP_MEMBERS group_id (grup tidak ada)' as check_name, COUNT(*) as count
FROM group_members gm
LEFT JOIN groups g ON g.id = gm.group_id
WHERE g.id IS NULL;

SELECT 'ORPHAN NUDGES intern_id (peserta tidak ada)' as check_name, COUNT(*) as count
FROM nudges n
LEFT JOIN interns i ON i.id = n.intern_id
WHERE i.id IS NULL;

SELECT 'DUPLICATE QUEST_LOGS (same quest+intern, multiple rows)' as check_name, COUNT(*) as count
FROM (
  SELECT quest_id, intern_id, COUNT(*) as cnt
  FROM quest_logs
  GROUP BY quest_id, intern_id
  HAVING COUNT(*) > 1
) dups;

SELECT 'TABLES EXISTENCE CHECK' as check_name,
  CASE WHEN to_regclass('quest_daily_completions') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS (run migration-quest-daily-completions.sql)' END as status;

SELECT 'ACTIVITY_BONUS_LOGS CHECK' as check_name,
  CASE WHEN to_regclass('activity_bonus_logs') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS (run migration-activity-bonus-logs.sql)' END as status;

SELECT 'XP_BONUS_LOGS CHECK' as check_name,
  CASE WHEN to_regclass('xp_bonus_logs') IS NOT NULL THEN 'EXISTS' ELSE 'NOT EXISTS (run migration-xp-bonus-logs.sql)' END as status;
