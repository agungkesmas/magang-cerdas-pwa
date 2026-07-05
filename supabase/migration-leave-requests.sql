-- ============================================================
-- MIGRATION: Tabel leave_requests (Sakit/Izin/Cuti/Dinas Luar)
-- Simulasi kerja realistis: peserta ajukan izin → admin approve/reject
-- Streak tidak putus kalau izin approved
-- ============================================================

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  intern_id UUID NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('sakit', 'izin', 'cuti', 'dinas-luar')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  medical_certificate_url TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Validasi: end_date >= start_date
  CONSTRAINT leave_dates_valid CHECK (end_date >= start_date)
);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
-- No public policy — all access via service role in API routes

-- Index untuk performance
CREATE INDEX IF NOT EXISTS idx_leave_requests_intern ON leave_requests(intern_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);

-- Verifikasi
SELECT 'leave_requests table created' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leave_requests');
