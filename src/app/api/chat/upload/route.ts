// ============================================================
// /api/chat/upload — Upload attachment (image/document) ke chat
// - Admin, pembina, peserta semua bisa upload
// - File disimpan ke Supabase Storage bucket 'chat-attachments'
// - Path: chat/<uuid>.<ext>
// - Max 10MB, ext whitelist: image (jpg/png/gif/webp) + doc (pdf/doc/docx/xls/xlsx/ppt/pptx/txt)
// - Return public URL untuk dipakai di /api/chat/send
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv']
};

function getExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

function classifyType(ext: string): 'image' | 'document' | null {
  if (ALLOWED.image.includes(ext)) return 'image';
  if (ALLOWED.document.includes(ext)) return 'document';
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const intern = await getInternToken();
    if (!admin && !pembina && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi 10MB' }, { status: 400 });
    }

    const ext = getExt(file.name);
    const type = classifyType(ext);
    if (!type) {
      return NextResponse.json(
        { error: `Tipe file tidak didukung. Allowed: ${[...ALLOWED.image, ...ALLOWED.document].join(', ')}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const uuid = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const path = `chat/${uuid}-${safeName}`;

    const supabase = createServerClient();
    const { error: upErr } = await supabase.storage
      .from('chat-attachments')
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (upErr) {
      console.error('[chat/upload] storage error:', upErr);
      return NextResponse.json({ error: `Upload gagal: ${upErr.message}` }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from('chat-attachments').getPublicUrl(path);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: 'Gagal mendapatkan public URL' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: pub.publicUrl,
      type,
      filename: file.name,
      size: file.size,
      path
    });
  } catch (e: any) {
    console.error('[chat/upload] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
