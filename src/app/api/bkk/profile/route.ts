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
      .select('id, email, name, phone, photo_url, is_active, last_login_at, created_at')
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

    const body = await req.json();

    // Mode 1: Change password
    if (body.current_password && body.new_password) {
      if (body.new_password.length < 8) {
        return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
      }
      const supabase = createServerClient();
      const { data: t } = await supabase
        .from('bkk_teachers')
        .select('password_hash')
        .eq('id', teacher.teacher_id)
        .single();
      if (!t) return NextResponse.json({ error: 'Teacher tidak ditemukan' }, { status: 404 });
      const valid = await verifyPassword(body.current_password, t.password_hash);
      if (!valid) return NextResponse.json({ error: 'Password lama salah' }, { status: 401 });
      const newHash = await hashPassword(body.new_password);
      const { error } = await supabase
        .from('bkk_teachers')
        .update({ password_hash: newHash, raw_password: body.new_password })
        .eq('id', teacher.teacher_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true });
    }

    // Mode 2: Update profile (phone + photo_url only — strict whitelist)
    const updates: Record<string, unknown> = {};
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.photo_url !== undefined) updates.photo_url = body.photo_url || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field valid. Hanya telepon dan foto yang bisa diubah.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('bkk_teachers').update(updates).eq('id', teacher.teacher_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
