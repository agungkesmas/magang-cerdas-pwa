-- ============================================================
-- Migration: Internship Requests (Permintaan Magang BKK → BPJTK)
-- Fitur: BKK kirim permintaan magang → Admin BPJTK review/terima/tolak
-- Tabel: internship_requests
-- ============================================================

-- ============================================================
-- Table: internship_requests
-- Status flow: draft → submitted → under_review → accepted/rejected → completed
-- ============================================================
CREATE TABLE IF NOT EXISTS internship_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Pengirim (BKK Teacher)
  bkk_teacher_id UUID NOT NULL REFERENCES bkk_teachers(id) ON DELETE CASCADE,
  school_name VARCHAR(255) NOT NULL,
  -- Detail permintaan
  request_title VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  -- Jumlah & profil peserta
  requested_slots INT NOT NULL DEFAULT 1,
  proposed_start_date DATE,
  proposed_end_date DATE,
  -- Jurusan/program studi yang diminta
  requested_majors TEXT,
  -- Departemen tujuan (Pelayanan/Pemasaran/Keuangan) - boleh kosong (flexible)
  requested_departments TEXT,
  -- Surat pengantar & proposal
  cover_letter TEXT,
  additional_notes TEXT,
  -- URL surat resmi (jika ada upload; untuk sekarang opsi link)
  attachment_url TEXT,
  -- Status workflow
  status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'completed', 'cancelled')),
  -- Review oleh admin
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  -- Jika diterima: info penempatan final
  accepted_slots INT,
  actual_start_date DATE,
  actual_end_date DATE,
  assigned_departments TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE internship_requests ENABLE ROW LEVEL SECURITY;
-- No public SELECT policy — all access via service role in API routes

CREATE INDEX IF NOT EXISTS idx_internship_requests_bkk ON internship_requests(bkk_teacher_id);
CREATE INDEX IF NOT EXISTS idx_internship_requests_status ON internship_requests(status);
CREATE INDEX IF NOT EXISTS idx_internship_requests_created ON internship_requests(created_at DESC);

-- ============================================================
-- Helper: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_internship_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_internship_requests_updated_at ON internship_requests;
CREATE TRIGGER trg_internship_requests_updated_at
  BEFORE UPDATE ON internship_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_internship_requests_updated_at();

-- ============================================================
-- Seed: 1 contoh permintaan (status submitted) untuk demo
-- Menggunakan BKK teacher default (bkk@magang-cerdas.local)
-- ============================================================
INSERT INTO internship_requests (
  bkk_teacher_id,
  school_name,
  request_title,
  contact_person,
  contact_phone,
  contact_email,
  requested_slots,
  proposed_start_date,
  proposed_end_date,
  requested_majors,
  requested_departments,
  cover_letter,
  additional_notes,
  status
)
SELECT
  bt.id,
  'SMK Negeri 1 Cirebon',
  'Permintaan Penempatan Magang Semester Ganjil 2026/2027',
  'Drs. Bambang Sutrisno, M.Pd.',
  '081234567890',
  'bkk@smkn1cirebon.sch.id',
  5,
  '2026-07-15'::DATE,
  '2026-12-15'::DATE,
  'Rekayasa Perangkat Lunak, Teknik Komputer Jaringan, Akuntansi',
  'Pelayanan, Pemasaran',
  'Dengan hormat, sehubungan dengan program magang industri (praktik kerja lapangan) bagi siswa kelas XII SMK Negeri 1 Cirebon tahun ajaran 2026/2027, kami mengajukan permohonan penempatan magang di BPJS Ketenagakerjaan Cabang Cirebon. Penempatan magang ini bertujuan untuk memberikan pengalaman kerja nyata kepada siswa sehingga mereka dapat mengaplikasikan ilmu yang dipelajari di sekolah dengan praktik di dunia kerja.',
  'Kami siap mengirimkan surat resmi dari kepala sekolah dan menandatangani perjanjian kerja sama (PKS) jika permohonan ini disetujui.',
  'submitted'
FROM bkk_teachers bt
WHERE bt.email = 'bkk@magang-cerdas.local'
ON CONFLICT DO NOTHING;

-- ============================================================
-- Seed: 1 contoh permintaan yang sudah diterima (history)
-- ============================================================
INSERT INTO internship_requests (
  bkk_teacher_id,
  school_name,
  request_title,
  contact_person,
  contact_phone,
  contact_email,
  requested_slots,
  proposed_start_date,
  proposed_end_date,
  requested_majors,
  requested_departments,
  cover_letter,
  status,
  reviewed_at,
  review_notes,
  accepted_slots,
  actual_start_date,
  actual_end_date,
  assigned_departments,
  created_at
)
SELECT
  bt.id,
  'SMK Negeri 1 Cirebon',
  'Permintaan Penempatan Magang Semester Genap 2025/2026',
  'Drs. Bambang Sutrisno, M.Pd.',
  '081234567890',
  'bkk@smkn1cirebon.sch.id',
  3,
  '2026-01-15'::DATE,
  '2026-06-15'::DATE,
  'Rekayasa Perangkat Lunak, Akuntansi',
  'Pelayanan, Keuangan',
  'Permintaan magang reguler untuk semester genap.',
  'accepted',
  NOW() - INTERVAL '90 days',
  'Disetujui untuk 3 peserta. Penempatan: 2 di Pelayanan, 1 di Keuangan.',
  3,
  '2026-01-15'::DATE,
  '2026-06-15'::DATE,
  'Pelayanan, Keuangan',
  NOW() - INTERVAL '120 days'
FROM bkk_teachers bt
WHERE bt.email = 'bkk@magang-cerdas.local'
ON CONFLICT DO NOTHING;
