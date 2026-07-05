-- ============================================================
-- MIGRATION: Tambah kolom bkk_id ke bkk_teachers (seperti pembina_id)
-- Idempotent — aman di-run ulang
-- ============================================================

-- Step 1: Tambah kolom bkk_id
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS bkk_id VARCHAR(20) UNIQUE;

-- Step 2: Backfill existing BKK teachers dengan ID BKK-0001, BKK-0002, dst
-- Urut berdasarkan created_at (yang paling lama dapat nomor terkecil)
DO $$
DECLARE
  rec RECORD;
  counter INT := 1;
  new_id VARCHAR(20);
BEGIN
  FOR rec IN
    SELECT id FROM bkk_teachers WHERE bkk_id IS NULL ORDER BY created_at ASC
  LOOP
    new_id := 'BKK-' || LPAD(counter::TEXT, 4, '0');
    UPDATE bkk_teachers SET bkk_id = new_id WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Step 3: Verifikasi
SELECT 'MIGRATION BKK_ID SELESAI' as info
UNION ALL SELECT 'bkk_teachers with bkk_id: ' || COUNT(*)::text FROM bkk_teachers WHERE bkk_id IS NOT NULL
UNION ALL SELECT 'bkk_teachers total: ' || COUNT(*)::text FROM bkk_teachers;
