-- ============================================================
-- FIX: Enable Realtime untuk chat_messages & quest_logs (Idempotent)
-- Jalankan di Supabase SQL Editor
--
-- Error sebelumnya: "relation chat_messages is already member of publication supabase_realtime"
-- Fix: pakai DO block untuk cek apakah tabel sudah ada di publication sebelum ADD
-- ============================================================

-- ============================================================
-- Step 1: Enable RLS (idempotent, tidak error kalau sudah enabled)
-- ============================================================
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Step 2: Drop policy jika sudah ada, lalu create (idempotent)
-- ============================================================
DROP POLICY IF EXISTS "Public read chat_messages" ON chat_messages;
CREATE POLICY "Public read chat_messages" ON chat_messages FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Public read quest_logs" ON quest_logs;
CREATE POLICY "Public read quest_logs" ON quest_logs FOR SELECT USING (TRUE);

-- ============================================================
-- Step 3: Add tables to supabase_realtime publication HANYA kalau belum ada
-- Pakai DO block untuk cek membership sebelum ALTER PUBLICATION
-- ============================================================
DO $$
BEGIN
  -- chat_messages
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    RAISE NOTICE 'Added chat_messages to supabase_realtime';
  ELSE
    RAISE NOTICE 'chat_messages already in supabase_realtime (skip)';
  END IF;

  -- quest_logs
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'quest_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quest_logs;
    RAISE NOTICE 'Added quest_logs to supabase_realtime';
  ELSE
    RAISE NOTICE 'quest_logs already in supabase_realtime (skip)';
  END IF;
END $$;

-- ============================================================
-- Step 4: VERIFIKASI (cek hasil)
-- ============================================================
SELECT 'VERIFIKASI REALTIME SETUP' as info;

-- Cek RLS enabled?
SELECT
  'RLS chat_messages: ' || (CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END) as check_status
FROM pg_class WHERE relname = 'chat_messages'
UNION ALL
SELECT
  'RLS quest_logs: ' || (CASE WHEN relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END)
FROM pg_class WHERE relname = 'quest_logs';

-- Cek policy SELECT sudah ada?
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('chat_messages', 'quest_logs')
ORDER BY tablename, policyname;

-- Cek tabel sudah di publication supabase_realtime?
SELECT
  tablename as table_in_realtime_publication
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('chat_messages', 'quest_logs')
ORDER BY tablename;
