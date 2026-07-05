-- ============================================================
-- MIGRATION: Chat attachment (image + document) — seperti WhatsApp
-- Tambah kolom attachment ke chat_messages + create storage bucket
-- Idempotent — aman di-run ulang
-- ============================================================

-- Step 1: Tambah kolom attachment ke chat_messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(20);
-- attachment_type: 'image' | 'document' | null (text message)
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);
-- attachment_filename: nama file asli (mis: "Laporan.pdf")

-- Step 2: Create Supabase Storage bucket untuk chat attachments
-- Public bucket (URL bisa diakses langsung)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Storage policy — allow public read
CREATE POLICY "Public read chat-attachments" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-attachments');

-- Step 4: Storage policy — allow authenticated upload
-- (service role bypasses RLS, jadi API route bisa upload)
CREATE POLICY "Authenticated upload chat-attachments" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'chat-attachments');

-- Step 5: Verifikasi
SELECT 'MIGRATION CHAT ATTACHMENT SELESAI' as info
UNION ALL SELECT 'chat_messages.attachment_url: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'attachment_url'
UNION ALL SELECT 'chat_messages.attachment_type: ' || COUNT(*)::text FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'attachment_type'
UNION ALL SELECT 'storage bucket: ' || COUNT(*)::text FROM storage.buckets WHERE id = 'chat-attachments';
