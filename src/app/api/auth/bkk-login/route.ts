// ============================================================
// /api/auth/bkk-login — BKK Teacher email+password login
// Returns: token + teacher info + schools array
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signBKKToken, setBKKCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: teacher, error } = await supabase
      .from('bkk_teachers')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error || !teacher) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, teacher.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 });
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
        email: teacher.email,
        name: teacher.name,
        schools
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
