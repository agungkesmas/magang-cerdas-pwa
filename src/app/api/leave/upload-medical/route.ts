// ============================================================
// /api/leave/upload-medical — Upload surat dokter untuk izin sakit
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

    const file = formData.get('medical') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File surat dokter wajib diupload' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file maksimal 5MB' }, { status: 400 });
    }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File harus berupa gambar atau PDF' }, { status: 400 });
    }

    const supabase = createServerClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${intern.intern_id}/medical-${uuidv4()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('attendance-photos')
      .upload(`medical/${fileName}`, file, { contentType: file.type, upsert: false });

    if (error) {
      if (error.message.includes('Bucket not found')) {
        return NextResponse.json({ error: 'Storage bucket belum dibuat' }, { status: 500 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from('attendance-photos').getPublicUrl(data.path);

    return NextResponse.json({ success: true, url: urlData?.publicUrl || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
