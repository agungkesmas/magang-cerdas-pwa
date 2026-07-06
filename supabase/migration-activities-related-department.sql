ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_department VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_activities_related_department ON activities(related_department) WHERE related_department IS NOT NULL;

SELECT 'MIGRATION RELATED_DEPARTMENT SELESAI' as info
UNION ALL SELECT 'related_department column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'related_department';
