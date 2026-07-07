UPDATE activities SET title = REPLACE(title, 'Penetapan ', '') WHERE is_quest = true AND title ILIKE '%Penetapan%';

UPDATE activities SET description = REPLACE(description, 'Penetapan ', '') WHERE is_quest = true AND description ILIKE '%Penetapan%';

UPDATE chat_messages SET content = REPLACE(content, 'Penetapan ', '') WHERE content LIKE '%Penetapan%' AND message_type = 'system';

UPDATE chat_messages SET content = REPLACE(content, 'Penetapan ', '') WHERE content LIKE '%Penetapan%' AND message_type = 'quest_card';

SELECT id, title, LEFT(description, 80) as desc_preview FROM activities WHERE is_quest = true AND (title ILIKE '%JHT%' OR title ILIKE '%penetapan%') ORDER BY title;
