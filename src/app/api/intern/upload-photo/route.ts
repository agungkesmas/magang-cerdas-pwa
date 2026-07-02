// ============================================================
// /api/intern/upload-photo — Upload profile photo to Supabase Storage
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Request bukan FormData yang valid' }, { status: 400 });
    }

    const file = formData.get('photo') as File | null;
    if (!file) return NextResponse.json({ error: 'File foto wajib diupload' }, { status: 400 });
    if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Ukuran foto maksimal 3MB' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File harus berupa gambar' }, { status: 400 });

    const supabase = createServerClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `profile/${intern.intern_id}/${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: urlData } = supabase.storage.from('attendance-photos').getPublicUrl(data.path);

    // Update intern profile
    await supabase.from('interns').update({ photo_url: urlData?.publicUrl || '' }).eq('id', intern.intern_id);

    return NextResponse.json({ success: true, url: urlData?.publicUrl || '' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
