// ============================================================
// /api/upload/signature — Upload official signature image (admin)
// Returns 400 for missing file (not 500)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData safely
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (e: any) {
      return NextResponse.json(
        { error: 'Request bukan FormData yang valid.' },
        { status: 400 }
      );
    }

    const file = formData.get('signature') as File | null;
    const officialId = formData.get('official_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File signature wajib diupload. Field name harus "signature".' },
        { status: 400 }
      );
    }
    if (!officialId) {
      return NextResponse.json(
        { error: 'official_id wajib diisi.' },
        { status: 400 }
      );
    }

    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran signature maksimal 3MB' },
        { status: 400 }
      );
    }

    // Validate file is image
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File harus berupa gambar (png/jpeg/webp)' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${officialId}/${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('certificates')
      .upload(`signatures/${fileName}`, file, { contentType: file.type, upsert: false });

    if (error) {
      console.error('[upload/signature] Storage error:', error);
      if (error.message.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'Storage bucket belum dibuat. Hubungi developer.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(data.path);

    // Update official record
    const { error: updateErr } = await supabase
      .from('officials')
      .update({ signature_url: urlData.publicUrl })
      .eq('id', officialId);

    if (updateErr) {
      console.error('[upload/signature] DB update error:', updateErr);
      // File already uploaded, but DB update failed — return success with warning
      return NextResponse.json({
        success: true,
        path: data.path,
        url: urlData.publicUrl,
        warning: 'File uploaded but failed to update official record: ' + updateErr.message
      });
    }

    return NextResponse.json({
      success: true,
      path: data.path,
      url: urlData.publicUrl
    });
  } catch (e: any) {
    console.error('[upload/signature] error:', e);
    return NextResponse.json({ error: 'Internal server error: ' + e.message }, { status: 500 });
  }
}
