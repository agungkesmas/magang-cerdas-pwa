-- ============================================================
-- Migration: Tabel bkk_notifications untuk notifikasi admin→BKK
--
-- Issue: Saat admin review/accept/reject permintaan magang,
-- BKK tidak dapat notifikasi otomatis. Harus refresh manual.
--
-- Effect:
--   - Admin bisa push notifikasi ke BKK teacher
--   - BKK dashboard sidebar badge menampilkan jumlah unread
--   - BKK bisa mark-as-read
-- ============================================================

CREATE TABLE IF NOT EXISTS bkk_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bkk_teacher_id UUID NOT NULL REFERENCES bkk_teachers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'request_update',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_request_id UUID REFERENCES internship_requests(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bkk_notif_teacher
  ON bkk_notifications(bkk_teacher_id, is_read, created_at DESC);

ALTER TABLE bkk_notifications ENABLE ROW LEVEL SECURITY;

-- Backfill: existing accepted/rejected requests → kirim notifikasi
-- (best-effort, skip kalau request sudah lama)
INSERT INTO bkk_notifications (bkk_teacher_id, type, title, message, related_request_id, is_read, created_at)
SELECT
  r.bkk_teacher_id,
  'request_update',
  CASE WHEN r.status = 'accepted' THEN 'Permintaan Magang Diterima'
       WHEN r.status = 'rejected' THEN 'Permintaan Magang Ditolak'
       WHEN r.status = 'completed' THEN 'Magang Selesai'
       ELSE 'Update Permintaan Magang' END,
  CASE WHEN r.status = 'accepted' THEN 'Permintaan magang Anda telah diterima admin. Slot: ' || COALESCE(r.accepted_slots::text, '-') || '. Silakan lanjutkan dengan menambahkan peserta magang.'
       WHEN r.status = 'rejected' THEN 'Permintaan magang Anda ditolak. Catatan: ' || COALESCE(r.review_notes, 'Tidak ada catatan')
       WHEN r.status = 'completed' THEN 'Periode magang telah selesai. Terima kasih.'
       ELSE 'Status permintaan magang Anda telah diperbarui.' END,
  r.id,
  TRUE,  -- mark as read karena backfill (sudah lewat)
  COALESCE(r.reviewed_at, r.updated_at, NOW())
FROM internship_requests r
WHERE r.status IN ('accepted', 'rejected', 'completed');
