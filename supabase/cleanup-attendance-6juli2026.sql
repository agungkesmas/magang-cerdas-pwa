-- ============================================================
-- CLEANUP: Hapus attendance tanggal 6 Juli 2026
--
-- Penyebab: User run SQL backfill lama (backfill-exp-presensi-6juli2026.sql)
-- yang insert check-in/out tanggal 6 Juli. Padahal 6 Juli adalah hari pertama
-- magang resmi yang seharusnya KOSONG (peserta check-in manual sendiri).
--
-- SQL ini hapus SEMUA attendance di tanggal 6 Juli 2026 (semua peserta).
-- EXP yang sudah diberikan dari backfill 6 Juli TIDAK di-roll back
-- (karena EXP 90 sudah di-set oleh backfill-exp-presensi-realistis.sql
-- yang override total_exp jadi 90 — jadi tidak ada double counting).
--
-- Idempotent — aman di-run ulang
-- ============================================================

-- Hapus semua attendance di tanggal 6 Juli 2026
DELETE FROM attendance
WHERE timestamp >= '2026-07-06 00:00:00+00'::timestamptz
  AND timestamp <  '2026-07-07 00:00:00+00'::timestamptz;

-- Verifikasi
SELECT COUNT(*) AS attendance_6juli_remaining
FROM attendance
WHERE timestamp >= '2026-07-06 00:00:00+00'::timestamptz
  AND timestamp <  '2026-07-07 00:00:00+00'::timestamptz;
