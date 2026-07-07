ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS maintenance_active BOOLEAN DEFAULT false;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS maintenance_started_at TIMESTAMPTZ;

UPDATE app_settings SET maintenance_active = false WHERE maintenance_active IS NULL;

SELECT 'MIGRATION MAINTENANCE MODE SELESAI' as info
UNION ALL SELECT 'maintenance_active column: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'app_settings' AND column_name = 'maintenance_active';
