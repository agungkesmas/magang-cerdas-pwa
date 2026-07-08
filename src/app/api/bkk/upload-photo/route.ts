// ============================================================
// /api/bkk/upload-photo — BKK teacher upload foto profil
// Simpan ke Supabase Storage bucket 'profile-photos'
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const bkk = await getBKKToken();
    if (!bkk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File;
    if (!file) {
      return NextResponse.json({ error: 'File foto wajib diupload' }, { status: 400 });
    }

    // Validate
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maksimal 3MB' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File harus gambar' }, { status: 400 });
    }

    const supabase = createServerClient();
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `bkk-${bkk.teacher_id}-${uuidv4().substring(0, 8)}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, { contentType: file.type, upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: 'Upload gagal: ' + uploadErr.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    const photoUrl = urlData.publicUrl;

    // Update BKK profile
    const { error: updateErr } = await supabase
      .from('bkk_teachers')
      .update({ photo_url: photoUrl })
      .eq('id', bkk.teacher_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, url: photoUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
