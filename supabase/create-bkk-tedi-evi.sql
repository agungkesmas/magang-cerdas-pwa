-- ============================================================
-- CREATE 2 BKK TEACHERS AT SMK AL HIDAYAH
-- Pa Tedi (081395898699) & Bu Evi (081324552645)
-- Idempotent — aman di-run ulang
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Pastikan SMK Al Hidayah ada di tabel schools
INSERT INTO schools (name, address, contact_phone) VALUES
  ('SMK Al Hidayah', NULL, NULL)
ON CONFLICT (name) DO NOTHING;

-- Step 2: Get SMK Al Hidayah ID
-- (di-step 3 pakai subquery)

-- ============================================================
-- BKK Teacher: Tedi (Pa/Bu)
-- Insert dengan bkk_id=NULL dulu, akan di-update di Step 3
-- ============================================================
INSERT INTO bkk_teachers (bkk_id, email, password_hash, raw_password, name, phone, is_active)
SELECT
  NULL, -- bkk_id akan di-update di Step 3 (sequential MAX+1)
  'tedi@smkalhidayah.sch.id',
  '$2a$10$K3iJSPPZXU1lbJivhlhX7Ogp1ihR7OtcZnFLWuumab.Ycmynh.8ke',
  'Bkk2026*gyAJ',
  'Tedi',
  '081395898699',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM bkk_teachers WHERE email = 'tedi@smkalhidayah.sch.id');

-- ============================================================
-- BKK Teacher: Evi (Pa/Bu)
-- Insert dengan bkk_id=NULL dulu, akan di-update di Step 3
-- ============================================================
INSERT INTO bkk_teachers (bkk_id, email, password_hash, raw_password, name, phone, is_active)
SELECT
  NULL, -- bkk_id akan di-update di Step 3 (sequential MAX+1)
  'evi@smkalhidayah.sch.id',
  '$2a$10$vIiZpa41A9oT9rwVKhG87ef9O211TIoDDY/fEqDUMynFlmtvp5FPa',
  'Bkk2026&q5nY',
  'Evi',
  '081324552645',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM bkk_teachers WHERE email = 'evi@smkalhidayah.sch.id');

-- ============================================================
-- Step 3: Generate BKK-XXXX ID yang benar (sequential MAX+1)
-- Update satu per satu untuk hindari UNIQUE conflict
-- ============================================================

-- Update Pa Tedi
UPDATE bkk_teachers SET bkk_id = ('BKK-' || LPAD((COALESCE((SELECT MAX(SPLIT_PART(bkk_id, '-', 2)::int) FROM bkk_teachers WHERE bkk_id ~ '^BKK-[0-9]+$'), 0) + 1)::text, 4, '0'))
WHERE email = 'tedi@smkalhidayah.sch.id' AND bkk_id IS NULL;

-- Update Bu Evi
UPDATE bkk_teachers SET bkk_id = ('BKK-' || LPAD((COALESCE((SELECT MAX(SPLIT_PART(bkk_id, '-', 2)::int) FROM bkk_teachers WHERE bkk_id ~ '^BKK-[0-9]+$'), 0) + 1)::text, 4, '0'))
WHERE email = 'evi@smkalhidayah.sch.id' AND bkk_id IS NULL;

-- ============================================================
-- Step 4: Link kedua BKK ke SMK Al Hidayah (junction table)
-- ============================================================
INSERT INTO bkk_teacher_schools (bkk_teacher_id, school_id)
SELECT bt.id, s.id
FROM bkk_teachers bt, schools s
WHERE s.name = 'SMK Al Hidayah'
  AND bt.email IN ('tedi@smkalhidayah.sch.id', 'evi@smkalhidayah.sch.id')
  AND NOT EXISTS (
    SELECT 1 FROM bkk_teacher_schools bts
    WHERE bts.bkk_teacher_id = bt.id AND bts.school_id = s.id
  );

-- ============================================================
-- Step 5: Verifikasi
-- ============================================================
SELECT '=== BKK TEACHERS DI SMK AL HIDAYAH ===' as info;
SELECT
  bt.bkk_id,
  bt.name,
  bt.email,
  bt.phone,
  bt.raw_password as password,
  bt.is_active,
  s.name as school
FROM bkk_teachers bt
JOIN bkk_teacher_schools bts ON bts.bkk_teacher_id = bt.id
JOIN schools s ON s.id = bts.school_id
WHERE s.name = 'SMK Al Hidayah'
ORDER BY bt.bkk_id;