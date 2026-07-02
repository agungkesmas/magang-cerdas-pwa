// ============================================================
// /api/auth/pembina-login — Login untuk pembina magang
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signPembinaToken, setPembinaCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: pembina, error } = await supabase
      .from('pembina_magang')
      .select('id, pembina_id, email, name, department, password_hash, is_active, raw_password')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !pembina) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    if (!pembina.is_active) {
      return NextResponse.json({ error: 'Akun pembina tidak aktif. Hubungi admin.' }, { status: 403 });
    }

    // Verify password
    const ok = await verifyPassword(password, pembina.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    // Update last_login_at
    await supabase.from('pembina_magang').update({ last_login_at: new Date().toISOString() }).eq('id', pembina.id);

    // Sign token
    const token = signPembinaToken({
      sub: pembina.id,
      pembina_id: pembina.id,
      pembina_code: pembina.pembina_id,
      email: pembina.email,
      name: pembina.name,
      department: pembina.department
    });
    await setPembinaCookie(token);

    return NextResponse.json({
      success: true,
      pembina: {
        id: pembina.id,
        pembina_id: pembina.pembina_id,
        email: pembina.email,
        name: pembina.name,
        department: pembina.department
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
