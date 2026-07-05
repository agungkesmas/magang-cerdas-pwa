-- ============================================================
-- Migration: Tags untuk Peserta & BKK
-- ============================================================
-- TUJUAN: Tambah kolom tags (JSONB array) ke interns & bkk_teachers
-- Predefined tags: Unggul, Perlu Perhatian, Leadership, Fast Learner, Bermasalah
--
-- CARA PAKAI: Run di Supabase SQL Editor
-- ============================================================

-- Add tags column to interns
ALTER TABLE interns ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Add tags column to bkk_teachers
ALTER TABLE bkk_teachers ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Verify
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name IN ('interns', 'bkk_teachers') AND column_name = 'tags';
