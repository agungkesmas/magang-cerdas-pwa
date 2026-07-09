// ============================================================
// /api/bkk/batch-password — Admin: ubah password massal guru BKK
//
// Body: { ids: string[] (min 1), mode: 'auto' | 'custom', custom_password?: string }
//   - mode='auto': generate password baru per BKK (format Bkk2026*xxxx)
//   - mode='custom': pakai 1 password untuk semua BKK yang dipilih
//
// Response: { success: true, results: [{ id, name, email, raw_password }] }
//
// Akses: Admin only
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword } from '@/lib/auth';

function generateAutoPassword(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let pwd = 'Bkk2026*';
  for (let i = 0; i < 4; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });

    const { ids, mode, custom_password } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids wajib diisi (array minimal 1)' }, { status: 400 });
    }
    if (mode !== 'auto' && mode !== 'custom') {
      return NextResponse.json({ error: 'mode harus "auto" atau "custom"' }, { status: 400 });
    }
    if (mode === 'custom') {
      if (!custom_password || custom_password.length < 8) {
        return NextResponse.json({ error: 'Custom password minimal 8 karakter.' }, { status: 400 });
      }
      if (custom_password.length > 64) {
        return NextResponse.json({ error: 'Custom password maksimal 64 karakter.' }, { status: 400 });
      }
    }

    const supabase = createServerClient();

    const { data: bkks, error: fErr } = await supabase
      .from('bkk_teachers')
      .select('id, name, email')
      .in('id', ids);

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 });
    if (!bkks || bkks.length === 0) {
      return NextResponse.json({ error: 'Tidak ada guru BKK ditemukan untuk ID yang dipilih.' }, { status: 404 });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const b of bkks) {
      const rawPassword = mode === 'auto' ? generateAutoPassword() : custom_password;
      try {
        const hash = await hashPassword(rawPassword);
        const { error: uErr } = await supabase
          .from('bkk_teachers')
          .update({ password_hash: hash, raw_password: rawPassword })
          .eq('id', b.id);
        if (uErr) {
          errors.push({ id: b.id, name: b.name, error: uErr.message });
        } else {
          results.push({ id: b.id, name: b.name, email: b.email, raw_password: rawPassword });
        }
      } catch (e: any) {
        errors.push({ id: b.id, name: b.name, error: e.message });
      }
    }

    return NextResponse.json({
      success: true,
      updated_count: results.length,
      error_count: errors.length,
      results,
      errors
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
