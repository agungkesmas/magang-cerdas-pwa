-- ============================================================
-- BACKFILL: EXP Maksimal + Presensi 1-3 Juli 2026 (hari kerja saja)
-- Tujuan: Penyemangat awal magang — peserta langsung Excellence + hadir penuh
--         3 hari kerja sebelum tanggal mulai resmi (6 Juli 2026)
--
-- Kalender Juli 2026:
--   1 Jul = Rabu   ✅ backfill
--   2 Jul = Kamis  ✅ backfill
--   3 Jul = Jumat  ✅ backfill
--   4 Jul = Sabtu  ❌ skip (weekend)
--   5 Jul = Minggu ❌ skip (weekend)
--   6 Jul = Senin  ❌ KOSONGKAN (besok, baru mulai magang)
--
-- Idempotent — aman di-run ulang (cek existing dulu sebelum insert)
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Set total_exp = 1500 (Excellence tier, >= 1000) untuk semua peserta aktif
-- Tier otomatis: Excellence (>=1000) 🏆, Competent (>=500), Participation (<500)
-- 1500 dipilih supaya aman di Excellence + masih ada room untuk growth
UPDATE interns
SET total_exp = 1500
WHERE is_active = true;

-- Step 2: Update streak_count = 3 (3 hari beruntun: 1, 2, 3 Juli 2026)
-- Standar industri: streak = jumlah hari check-in beruntun
UPDATE interns
SET streak_count = 3
WHERE is_active = true
  AND (streak_count IS NULL OR streak_count < 3);

-- ============================================================
-- Step 3: Backfill presensi 1 Juli 2026 (Rabu)
-- Check-In 08:00 WIB (01:00 UTC) & Check-Out 17:00 WIB (10:00 UTC)
-- Idempotent: hanya insert jika belum ada presensi di tanggal tersebut
-- ============================================================

-- 3a. Backfill 1 Juli 2026 (Rabu) — Check-In 08:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-01 01:00:00+00'::timestamptz,  -- 08:00 WIB = 01:00 UTC
  'Check-In',
  true,
  'Backfill penyemangat — Hadir penuh hari kerja pertama'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-In'
      AND a.timestamp >= '2026-07-01 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-02 00:00:00+00'::timestamptz
  );

-- 3b. Backfill 1 Juli 2026 (Rabu) — Check-Out 17:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-01 10:00:00+00'::timestamptz,  -- 17:00 WIB = 10:00 UTC
  'Check-Out',
  true,
  'Backfill penyemangat — Hadir penuh hari kerja pertama'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-Out'
      AND a.timestamp >= '2026-07-01 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-02 00:00:00+00'::timestamptz
  );

-- ============================================================
-- Step 4: Backfill 2 Juli 2026 (Kamis)
-- ============================================================

-- 4a. Check-In 08:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-02 01:00:00+00'::timestamptz,
  'Check-In',
  true,
  'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-In'
      AND a.timestamp >= '2026-07-02 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-03 00:00:00+00'::timestamptz
  );

-- 4b. Check-Out 17:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-02 10:00:00+00'::timestamptz,
  'Check-Out',
  true,
  'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-Out'
      AND a.timestamp >= '2026-07-02 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-03 00:00:00+00'::timestamptz
  );

-- ============================================================
-- Step 5: Backfill 3 Juli 2026 (Jumat)
-- ============================================================

-- 5a. Check-In 08:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-03 01:00:00+00'::timestamptz,
  'Check-In',
  true,
  'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-In'
      AND a.timestamp >= '2026-07-03 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-04 00:00:00+00'::timestamptz
  );

-- 5b. Check-Out 17:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-03 10:00:00+00'::timestamptz,
  'Check-Out',
  true,
  'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-Out'
      AND a.timestamp >= '2026-07-03 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-04 00:00:00+00'::timestamptz
  );

-- ============================================================
-- CATATAN PENTING:
-- - 4 Juli 2026 (Sabtu) & 5 Juli 2026 (Minggu) TIDAK di-backfill (weekend)
-- - 6 Juli 2026 (Senin) TIDAK di-backfill (besok, peserta baru mulai magang)
-- - Peserta akan check-in manual mulai 6 Juli 2026
-- ============================================================

-- ============================================================
-- Step 6: Verifikasi
-- ============================================================
SELECT '=== RINGKASAN BACKFILL 1-3 JULI 2026 ===' as info;

SELECT
  (SELECT COUNT(*) FROM interns WHERE is_active = true)                                            AS peserta_aktif,
  (SELECT COUNT(*) FROM interns WHERE is_active = true AND total_exp >= 1000)                      AS tier_excellence,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-01')    AS checkin_1juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-01')    AS checkout_1juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-02')    AS checkin_2juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-02')    AS checkout_2juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-03')    AS checkin_3juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-03')    AS checkout_3juli,
  (SELECT COUNT(*) FROM attendance WHERE timestamp::date = '2026-07-04')                           AS presensi_4juli_sabtu,
  (SELECT COUNT(*) FROM attendance WHERE timestamp::date = '2026-07-05')                           AS presensi_5juli_minggu,
  (SELECT COUNT(*) FROM attendance WHERE timestamp::date = '2026-07-06')                           AS presensi_6juli_senin;

-- Detail per peserta (untuk konfirmasi)
SELECT
  i.name,
  i.department,
  i.total_exp,
  CASE
    WHEN i.total_exp >= 1000 THEN 'Excellence 🏆'
    WHEN i.total_exp >= 500  THEN 'Competent ✅'
    ELSE 'Participation 📋'
  END AS tier,
  i.streak_count AS streak,
  (SELECT COUNT(*) FROM attendance a
   WHERE a.intern_id = i.id
     AND a.timestamp::date IN ('2026-07-01', '2026-07-02', '2026-07-03')) AS presensi_3hari
FROM interns i
WHERE i.is_active = true
ORDER BY i.department, i.name;
