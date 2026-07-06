// ============================================================
// /api/upload/attendance-photo — Upload foto selfie check-in
// File disimpan ke Supabase Storage bucket 'attendance-photos'
// Return public URL yang dipakai di /api/attendance/check-in
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken, getAdminToken } from '@/lib/auth';

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: NextRequest) {
  try {
    // Auth: peserta atau admin (admin might need for testing)
    const intern = await getInternToken();
    const admin = await getAdminToken();
    if (!intern && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('photo') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'File foto tidak ditemukan' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Ukuran foto melebihi 5MB' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Format tidak didukung. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `checkin/${timestamp}-${Math.random().toString(36).substring(7)}.${ext}`;

    const supabase = createServerClient();

    // Upload ke Supabase Storage
    const { error: upErr } = await supabase.storage
      .from('attendance-photos')
      .upload(path, file, {
        contentType: file.type,
        upsert: false
      });

    if (upErr) {
      console.error('[upload/attendance-photo] storage error:', upErr);
      return NextResponse.json(
        { error: `Upload gagal: ${upErr.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: pub } = supabase.storage.from('attendance-photos').getPublicUrl(path);
    if (!pub?.publicUrl) {
      return NextResponse.json({ error: 'Gagal mendapatkan URL foto' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: pub.publicUrl
    });
  } catch (e: any) {
    console.error('[upload/attendance-photo] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
