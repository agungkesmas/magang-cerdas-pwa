-- ============================================================
-- BACKFILL: Insert activity_completions dari quest_logs yang sudah completed
-- Untuk Quest yang di-submit SEBELUM fix Bug #1 (commit terbaru)
--
-- Setelah run SQL ini, Quest yang sudah dikerjakan sebelumnya akan
-- muncul di halaman /intern/activities tab "Riwayat"
-- ============================================================

INSERT INTO activity_completions (activity_id, intern_id, completion_notes)
SELECT
  ql.quest_id AS activity_id,
  ql.intern_id,
  COALESCE(ql.submission_notes, '[Quest] Selesai dari grup chat. XP: ' || ql.xp_awarded::text)
FROM quest_logs ql
WHERE ql.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM activity_completions ac
    WHERE ac.activity_id = ql.quest_id
      AND ac.intern_id = ql.intern_id
  )
ON CONFLICT (activity_id, intern_id) DO NOTHING;

-- Verifikasi
SELECT
  'BACKFILL SELESAI' as info,
  COUNT(*) as quest_completions_backfilled
FROM activity_completions ac
JOIN quest_logs ql ON ac.activity_id = ql.quest_id AND ac.intern_id = ql.intern_id
WHERE ql.status = 'completed';
