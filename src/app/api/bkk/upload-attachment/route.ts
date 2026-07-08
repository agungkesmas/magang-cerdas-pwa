// ============================================================
// /api/bkk/upload-attachment — BKK upload surat PDF / Excel siswa
// Simpan ke Supabase Storage bucket 'chat-attachments' (reuse)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const bkk = await getBKKToken();
    if (!bkk) {
      return NextResponse.json({ error: 'Unauthorized — BKK only' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'File wajib diupload' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maksimal 5MB' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Format tidak valid. Gunakan PDF, XLSX, XLS, atau CSV.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `bkk-attachment-${bkk.teacher_id}-${uuidv4().substring(0, 8)}.${fileExt}`;

    // Upload to Supabase Storage (reuse chat-attachments bucket)
    const { error: uploadErr } = await supabase.storage
      .from('chat-attachments')
      .upload(fileName, file, { contentType: file.type, upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: 'Upload gagal: ' + uploadErr.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
