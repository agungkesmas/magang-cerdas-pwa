// ============================================================
// /api/schools/[id]/bkk-teachers — Get BKK teachers linked to a school
// Admin only
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // Verify school exists
    const { data: school, error: sErr } = await supabase
      .from('schools')
      .select('*')
      .eq('id', params.id)
      .single();
    if (sErr || !school) {
      return NextResponse.json({ error: 'Sekolah tidak ditemukan' }, { status: 404 });
    }

    // Get all BKK teachers linked to this school via junction table
    const { data: junctions, error: jErr } = await supabase
      .from('bkk_teacher_schools')
      .select('bkk_teacher_id, bkk_teachers(id, email, name, phone, is_active, raw_password, last_login_at, created_at)')
      .eq('school_id', params.id);
    if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });

    const teachers = (junctions || [])
      .map((j: any) => j.bkk_teachers)
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      school,
      teachers
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
