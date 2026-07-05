-- ============================================================
-- BACKFILL REALISTIS: EXP +90 + Presensi 1-3 Juli 2026 (hari kerja saja)
--
-- Tujuan: Penyemangat awal magang — peserta sudah mulai dengan EXP kecil
--         wajar (3 hari absen saja), bukan langsung Excellence.
--
-- Perubahan dari versi sebelumnya:
-- - EXP awal: 90 (3 hari × 30 EXP/hari = CI+CO saja, tanpa tugas)
-- - Streak: 3 hari (1, 2, 3 Juli 2026)
-- - Tier system: DINAMIS berdasarkan durasi magang per peserta
--   * Participation: < 25% max_exp
--   * Competent: 25%-50% max_exp
--   * Excellence: >= 50% max_exp
--   * Untuk 6 bulan magang (±130 hari kerja), max_exp ≈ 8000
--   * EXP 90 = ~1% → Participation (wajar untuk peserta baru)
--
-- Kalender Juli 2026:
--   1 Jul = Rabu   ✅ backfill
--   2 Jul = Kamis  ✅ backfill
--   3 Jul = Jumat  ✅ backfill
--   4 Jul = Sabtu  ❌ skip (weekend)
--   5 Jul = Minggu ❌ skip (weekend)
--   6 Jul = Senin  ❌ KOSONGKAN (besok, baru mulai magang resmi)
--
-- Idempotent — aman di-run ulang
-- CARA PAKAI: Run di Supabase SQL Editor
--
-- CATATAN: Kalau sebelumnya sudah run SQL backfill-exp-presensi-6juli2026.sql
-- atau backfill-exp-presensi-1-3juli2026.sql (yang set EXP=1500), SQL ini
-- akan OVERRIDE total_exp jadi 90. Streak & attendance tetap idempotent.
-- ============================================================

-- Step 1: Set total_exp = 90 (3 hari absen realistis: 3×CI + 3×CO = 3×20+3×10 = 90)
-- untuk semua peserta aktif
UPDATE interns
SET total_exp = 90
WHERE is_active = true;

-- Step 2: Update streak_count = 3 (3 hari beruntun: 1, 2, 3 Juli 2026)
UPDATE interns
SET streak_count = 3
WHERE is_active = true
  AND (streak_count IS NULL OR streak_count < 3);

-- ============================================================
-- Step 3: Backfill presensi 1 Juli 2026 (Rabu)
-- Check-In 08:00 WIB (01:00 UTC) & Check-Out 17:00 WIB (10:00 UTC)
-- Idempotent: hanya insert jika belum ada presensi di tanggal tersebut
-- ============================================================

-- 3a. Check-In 08:00 WIB
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

-- 3b. Check-Out 17:00 WIB
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

INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT i.id, '2026-07-02 01:00:00+00'::timestamptz, 'Check-In', true, 'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a WHERE a.intern_id = i.id AND a.type = 'Check-In'
      AND a.timestamp >= '2026-07-02 00:00:00+00'::timestamptz AND a.timestamp < '2026-07-03 00:00:00+00'::timestamptz
  );

INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT i.id, '2026-07-02 10:00:00+00'::timestamptz, 'Check-Out', true, 'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a WHERE a.intern_id = i.id AND a.type = 'Check-Out'
      AND a.timestamp >= '2026-07-02 00:00:00+00'::timestamptz AND a.timestamp < '2026-07-03 00:00:00+00'::timestamptz
  );

-- ============================================================
-- Step 5: Backfill 3 Juli 2026 (Jumat)
-- ============================================================

INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT i.id, '2026-07-03 01:00:00+00'::timestamptz, 'Check-In', true, 'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a WHERE a.intern_id = i.id AND a.type = 'Check-In'
      AND a.timestamp >= '2026-07-03 00:00:00+00'::timestamptz AND a.timestamp < '2026-07-04 00:00:00+00'::timestamptz
  );

INSERT INTO attendance (intern_id, timestamp, type, is_within_geofence, notes)
SELECT i.id, '2026-07-03 10:00:00+00'::timestamptz, 'Check-Out', true, 'Backfill penyemangat — Hadir penuh hari kerja'
FROM interns i
WHERE i.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM attendance a WHERE a.intern_id = i.id AND a.type = 'Check-Out'
      AND a.timestamp >= '2026-07-03 00:00:00+00'::timestamptz AND a.timestamp < '2026-07-04 00:00:00+00'::timestamptz
  );

-- ============================================================
-- CATATAN:
-- - 4-5 Juli (Sabtu, Minggu) TIDAK di-backfill (weekend)
-- - 6 Juli (Senin) TIDAK di-backfill (besok, peserta baru mulai magang)
-- - Tier system sekarang DINAMIS (lihat calculateTier di src/lib/utils.ts)
--   * Threshold tergantung durasi magang per peserta
--   * Untuk 6 bulan: max_exp ≈ 8000, Excellence threshold ≈ 4000
--   * EXP 90 saat ini = ~1% → Participation (wajar untuk peserta baru)
-- ============================================================

-- ============================================================
-- Step 6: Verifikasi
-- ============================================================
SELECT '=== RINGKASAN BACKFILL REALISTIS ===' as info;

SELECT
  (SELECT COUNT(*) FROM interns WHERE is_active = true)                                            AS peserta_aktif,
  (SELECT AVG(total_exp)::int FROM interns WHERE is_active = true)                                 AS rata_exp,
  (SELECT MIN(total_exp) FROM interns WHERE is_active = true)                                      AS min_exp,
  (SELECT MAX(total_exp) FROM interns WHERE is_active = true)                                      AS max_exp,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-01')    AS checkin_1juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-01')    AS checkout_1juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-02')    AS checkin_2juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-02')    AS checkout_2juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-In'  AND timestamp::date = '2026-07-03')    AS checkin_3juli,
  (SELECT COUNT(*) FROM attendance WHERE type = 'Check-Out' AND timestamp::date = '2026-07-03')    AS checkout_3juli,
  (SELECT COUNT(*) FROM attendance WHERE timestamp::date = '2026-07-04')                           AS presensi_4juli_sabtu,
  (SELECT COUNT(*) FROM attendance WHERE timestamp::date = '2026-07-05')                           AS presensi_5juli_minggu,
  (SELECT COUNT(*) FROM attendance WHERE timestamp::date = '2026-07-06')                           AS presensi_6juli_senin;

-- Detail per peserta + estimasi tier berdasarkan durasi magang masing-masing
-- (Tier dihitung dinamis: 25% max_exp = Competent, 50% = Excellence)
SELECT
  i.name,
  i.department,
  i.total_exp,
  i.streak_count AS streak,
  i.start_date,
  i.end_date,
  -- Hitung working days & max_exp on-the-fly (sesuai rumus di src/lib/utils.ts)
  (
    SELECT COUNT(*) FROM generate_series(
      i.start_date::timestamptz,
      i.end_date::timestamptz,
      '1 day'::interval
    ) AS d
    WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)  -- exclude Sabtu(6) & Minggu(0)
  ) AS working_days,
  -- max_exp = working_days*50 + weeks*20 + weeks*30 + 200
  (
    (SELECT COUNT(*) FROM generate_series(
      i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval
    ) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) * 50
    + FLOOR((SELECT COUNT(*) FROM generate_series(
      i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval
    ) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) / 5.0) * 20
    + FLOOR((SELECT COUNT(*) FROM generate_series(
      i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval
    ) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) / 5.0) * 30
    + 200
  ) AS max_exp_teoritis,
  -- Tier dinamis (25%/50% threshold)
  CASE
    WHEN i.total_exp >= (
      (SELECT COUNT(*) FROM generate_series(i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) * 50
      + FLOOR((SELECT COUNT(*) FROM generate_series(i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) / 5.0) * 50
      + 200
    ) * 0.5 THEN 'Excellence 🏆'
    WHEN i.total_exp >= (
      (SELECT COUNT(*) FROM generate_series(i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) * 50
      + FLOOR((SELECT COUNT(*) FROM generate_series(i.start_date::timestamptz, i.end_date::timestamptz, '1 day'::interval) AS d WHERE EXTRACT(ISODOW FROM d) NOT IN (6, 0)) / 5.0) * 50
      + 200
    ) * 0.25 THEN 'Competent ✅'
    ELSE 'Participation 📋'
  END AS tier_estimasi,
  (SELECT COUNT(*) FROM attendance a
   WHERE a.intern_id = i.id
     AND a.timestamp::date IN ('2026-07-01', '2026-07-02', '2026-07-03')) AS presensi_3hari
FROM interns i
WHERE i.is_active = true
ORDER BY i.department, i.name;
