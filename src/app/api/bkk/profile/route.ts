// ============================================================
// /api/bkk/profile — BKK teacher's own profile + change password
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken, hashPassword, verifyPassword } from '@/lib/auth';

export async function GET() {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data: t, error } = await supabase
      .from('bkk_teachers')
      .select('id, email, name, phone, is_active, last_login_at, created_at')
      .eq('id', teacher.teacher_id)
      .single();
    if (error || !t) return NextResponse.json({ error: 'Teacher tidak ditemukan' }, { status: 404 });

    // Get linked schools
    const { data: junctions } = await supabase
      .from('bkk_teacher_schools')
      .select('schools(id, name, address)')
      .eq('bkk_teacher_id', teacher.teacher_id);
    const schools = (junctions || []).map((j: any) => j.schools).filter(Boolean);

    return NextResponse.json({
      success: true,
      profile: {
        ...t,
        schools
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Change password (self-service)
export async function PUT(req: NextRequest) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { current_password, new_password } = await req.json();
    if (!current_password || !new_password) {
      return NextResponse.json({ error: 'Password lama dan baru wajib diisi' }, { status: 400 });
    }
    if (new_password.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get current password hash
    const { data: t } = await supabase
      .from('bkk_teachers')
      .select('password_hash')
      .eq('id', teacher.teacher_id)
      .single();
    if (!t) return NextResponse.json({ error: 'Teacher tidak ditemukan' }, { status: 404 });

    // Verify current password
    const valid = await verifyPassword(current_password, t.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
    }

    // Update password
    const newHash = await hashPassword(new_password);
    const { error } = await supabase
      .from('bkk_teachers')
      .update({ password_hash: newHash, raw_password: new_password })
      .eq('id', teacher.teacher_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
