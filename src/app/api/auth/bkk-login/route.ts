// ============================================================
// /api/auth/bkk-login — BKK Teacher login via email ATAU BKK-XXXX
// Returns: token + teacher info + schools array
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signBKKToken, setBKKCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email/ID BKK dan password wajib diisi' }, { status: 400 });
    }

    const loginInput = String(email).trim();
    const supabase = createServerClient();

    // Deteksi: input mengandung '@' → email, kalau tidak → anggap ID BKK (BKK-XXXX)
    let query = supabase
      .from('bkk_teachers')
      .select('*')
      .eq('is_active', true);

    if (loginInput.includes('@')) {
      // Login via email
      query = query.eq('email', loginInput.toLowerCase());
    } else {
      // Login via bkk_id (BKK-XXXX) — case insensitive
      const upperInput = loginInput.toUpperCase();
      const lowerInput = loginInput.toLowerCase();
      query = query.or(`bkk_id.eq.${upperInput},bkk_id.eq.${lowerInput},bkk_id.eq.${loginInput}`);
    }

    const { data: teacher, error } = await query.maybeSingle();

    if (error || !teacher) {
      return NextResponse.json({ error: 'Email/ID BKK atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, teacher.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Email/ID BKK atau password salah' }, { status: 401 });
    }

    // Get linked schools
    const { data: junctions } = await supabase
      .from('bkk_teacher_schools')
      .select('schools(id, name)')
      .eq('bkk_teacher_id', teacher.id);
    const schools = (junctions || []).map((j: any) => j.schools?.name).filter(Boolean) as string[];

    // Update last_login_at
    await supabase
      .from('bkk_teachers')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', teacher.id);

    const token = signBKKToken({
      sub: teacher.id,
      teacher_id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      schools
    });
    await setBKKCookie(token);

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        bkk_id: teacher.bkk_id,
        email: teacher.email,
        name: teacher.name,
        schools
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
