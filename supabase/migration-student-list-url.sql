-- Migration: Tambah kolom student_list_url di internship_requests
-- Untuk simpan URL Excel daftar siswa yang BKK upload saat ajukan permintaan

ALTER TABLE internship_requests
ADD COLUMN IF NOT EXISTS student_list_url TEXT;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'internship_requests'
  AND column_name = 'student_list_url';
