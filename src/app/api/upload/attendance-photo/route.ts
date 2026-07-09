// ============================================================
// /api/upload/attendance-photo — Upload selfie photo to Supabase Storage
// Returns 400 for missing file (not 500)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData safely — return 400 if malformed
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Request bukan FormData yang valid. Pastikan kirim multipart/form-data.' },
        { status: 400 }
      );
    }

    const file = formData.get('photo') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'File foto wajib diupload. Field name harus "photo".' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran foto maksimal 5MB' },
        { status: 400 }
      );
    }

    // Validate file is actually an image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File harus berupa gambar (jpeg/png/webp)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${intern.intern_id}/${new Date().toISOString().split('T')[0]}-${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(fileName, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error('[upload/attendance-photo] Storage error:', error);
      // User-friendly messages for common storage errors
      if (error.message.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage bucket belum dibuat. Hubungi admin untuk setup.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('attendance-photos').getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      path: data.path,
      url: urlData.publicUrl
    });
  } catch (e: any) {
    console.error('[upload/attendance-photo] error:', e);
    return NextResponse.json({ error: 'Internal server error: ' + e.message }, { status: 500 });
  }
}
