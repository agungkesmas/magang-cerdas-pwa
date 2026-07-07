DELETE FROM chat_messages WHERE message_type = 'system' AND (content LIKE '%memulai quest%' OR content LIKE '%menyelesaikan quest%' OR content LIKE '%mendeploy quest baru%');

SELECT 'CLEANUP SELESAI' as info, COUNT(*) as deleted_count FROM chat_messages WHERE message_type = 'system' AND (content LIKE '%memulai quest%' OR content LIKE '%menyelesaikan quest%' OR content LIKE '%mendeploy quest baru%');
