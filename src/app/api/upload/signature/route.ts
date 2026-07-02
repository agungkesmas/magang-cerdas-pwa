// ============================================================
// /api/upload/signature — Upload official signature image (admin)
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

    const formData = await req.formData();
    const file = formData.get('signature') as File | null;
    const officialId = formData.get('official_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File signature wajib diupload' }, { status: 400 });
    }
    if (!officialId) {
      return NextResponse.json({ error: 'official_id wajib diisi' }, { status: 400 });
    }

    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran signature maksimal 3MB' }, { status: 400 });
    }

    const supabase = createServerClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${officialId}/${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('certificates')
      .upload(`signatures/${fileName}`, file, { contentType: file.type, upsert: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(data.path);

    // Update official record
    await supabase
      .from('officials')
      .update({ signature_url: urlData.publicUrl })
      .eq('id', officialId);

    return NextResponse.json({
      success: true,
      path: data.path,
      url: urlData.publicUrl
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
