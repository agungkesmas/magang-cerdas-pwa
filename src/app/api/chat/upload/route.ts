// ============================================================
// /api/chat/upload — Upload image/document attachment ke chat
// Accepts: multipart/form-data with "file" field
// Returns: { url, filename, type, size }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv'
];

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'
];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const intern = await getInternToken();
    if (!admin && !pembina && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Request bukan FormData yang valid' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File wajib diupload (field name: "file")' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Ukuran file maksimal 10MB' }, { status: 400 });
    }

    // Determine type (image or document)
    const mimeType = file.type || '';
    const fileName = file.name || 'attachment';
    const ext = '.' + fileName.split('.').pop()?.toLowerCase();

    let attachmentType: 'image' | 'document';

    if (ALLOWED_IMAGE_TYPES.includes(mimeType) || ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
      attachmentType = 'image';
    } else if (ALLOWED_DOC_TYPES.includes(mimeType) || ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv'].includes(ext)) {
      attachmentType = 'document';
    } else {
      return NextResponse.json({
        error: `Tipe file tidak didukung. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = ext || (attachmentType === 'image' ? '.jpg' : '.pdf');
    const uniqueFileName = `${uuidv4()}${fileExt}`;
    const filePath = `chat/${uniqueFileName}`;

    const supabase = createServerClient();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('chat-attachments')
      .upload(filePath, file, {
        contentType: mimeType || 'application/octet-stream',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[chat/upload] storage error:', uploadError);
      return NextResponse.json({ error: 'Gagal upload file: ' + uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('chat-attachments')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      filename: fileName,
      type: attachmentType,
      size: file.size
    });
  } catch (e: any) {
    console.error('[chat/upload] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
