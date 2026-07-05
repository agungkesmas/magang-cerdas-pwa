-- ============================================================
-- BACKFILL: EXP Maksimal + Presensi 6 Juli 2026 untuk semua peserta aktif
-- Tujuan: Penyemangat awal magang — peserta sudah Excellence + hadir penuh hari pertama
-- Idempotent — aman di-run ulang (cek existing dulu sebelum insert)
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Step 1: Set total_exp = 1500 (Excellence tier, >= 1000) untuk semua peserta aktif
-- Tier otomatis: Excellence (>=1000) 🏆, Competent (>=500), Participation (<500)
-- 1500 dipilih supaya aman di Excellence + masih ada room untuk growth
UPDATE interns
SET total_exp = 1500
WHERE is_active = true;

-- Step 2: Backfill presensi tanggal 6 Juli 2026 (Senin)
-- Check-In 08:00 WIB (01:00 UTC) & Check-Out 17:00 WIB (10:00 UTC)
-- Idempotent: hanya insert jika belum ada presensi di tanggal tersebut

-- 2a. Check-In 08:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-06 01:00:00+00'::timestamptz,  -- 08:00 WIB = 01:00 UTC
  'Check-In',
  true,
  'Backfill penyemangat — Hadir penuh hari pertama magang'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-In'
      AND a.timestamp >= '2026-07-06 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-07 00:00:00+00'::timestamptz
  );

-- 2b. Check-Out 17:00 WIB
INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT
  i.id,
  '2026-07-06 10:00:00+00'::timestamptz,  -- 17:00 WIB = 10:00 UTC
  'Check-Out',
  true,
  'Backfill penyemangat — Hadir penuh hari pertama magang'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.intern_id = i.id
      AND a.type = 'Check-Out'
      AND a.timestamp >= '2026-07-06 00:00:00+00'::timestamptz
      AND a.timestamp <  '2026-07-07 00:00:00+00'::timestamptz
  );

-- Step 3: Update streak_count = 1 untuk semua peserta aktif (badge "1 hari beruntun")
-- Standar industri: streak = jumlah hari check-in beruntun. Hari pertama = 1.
UPDATE interns
SET streak_count = 1
WHERE is_active = true
  AND (streak_count IS NULL OR streak_count = 0);

-- ============================================================
-- Step 4: Verifikasi
-- ============================================================
SELECT '=== RINGKASAN BACKFILL 6 JULI 2026 ===' as info;

SELECT
  (SELECT COUNT(*) FROM interns WHERE is_active = true)                                            AS peserta_aktif,
  (SELECT COUNT(*) FROM interns WHERE is_active = true AND total_exp >= 1000)                      AS tier_excellence,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-06')    AS checkin_6juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-06')    AS checkout_6juli;

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
     AND a.timestamp::date = '2026-07-06') AS presensi_6juli
FROM interns i
WHERE i.is_active = true
ORDER BY i.department, i.name;
