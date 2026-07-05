// ============================================================
// /api/admin/certificate-upload-logo — Upload logo custom untuk sertifikat
//
// - File disimpan ke Supabase Storage bucket 'certificate-assets'
// - Path: logo/certificate-logo-<timestamp>.<ext>
// - Support: PNG, JPG, JPEG, SVG, WebP
// - Max size: 2MB
// - Return: public URL
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

function getExt(filename: string): string {
  const m = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran file melebihi 2MB' }, { status: 400 });
    }

    const ext = getExt(file.name);
    if (!ALLOWED.includes(ext)) {
      return NextResponse.json(
        { error: `Format tidak didukung. Allowed: ${ALLOWED.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
    const path = `logo/certificate-logo-${timestamp}-${safeName}`;

    const supabase = createServerClient();
    const { error: upErr } = await supabase.storage
      .from('certificate-assets')
      .upload(path, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (upErr) {
      console.error('[certificate-upload-logo] storage error:', upErr);
      return NextResponse.json({ error: `Upload gagal: ${upErr.message}` }, { status: 500 });
    }

    const { data: pub } = supabase.storage.from('certificate-assets').getPublicUrl(path);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: 'Gagal mendapatkan public URL' }, { status: 500 });
    }

    // Update certificate_settings.logo_url
    await supabase
      .from('certificate_settings')
      .upsert({
        id: 1,
        logo_url: pub.publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: admin.sub
      }, { onConflict: 'id' });

    return NextResponse.json({
      success: true,
      logo_url: pub.publicUrl,
      message: 'Logo berhasil diupload'
    });
  } catch (e: any) {
    console.error('[certificate-upload-logo] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
