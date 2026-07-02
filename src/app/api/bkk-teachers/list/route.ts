// ============================================================
// /api/bkk-teachers/list — List all BKK teachers (admin only)
// Returns teachers with their linked schools
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // Get all BKK teachers
    const { data: teachers, error: tErr } = await supabase
      .from('bkk_teachers')
      .select('id, email, name, phone, is_active, last_login_at, raw_password, created_at')
      .order('created_at', { ascending: false });
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

    // Get all junction records
    const { data: junctions, error: jErr } = await supabase
      .from('bkk_teacher_schools')
      .select('bkk_teacher_id, school_id, schools(id, name)');
    if (jErr) return NextResponse.json({ error: jErr.message }, { status: 500 });

    // Build school map per teacher
    const schoolsPerTeacher: Record<string, any[]> = {};
    (junctions || []).forEach((j: any) => {
      if (!schoolsPerTeacher[j.bkk_teacher_id]) schoolsPerTeacher[j.bkk_teacher_id] = [];
      if (j.schools) schoolsPerTeacher[j.bkk_teacher_id].push(j.schools);
    });

    const result = (teachers || []).map((t) => ({
      ...t,
      schools: schoolsPerTeacher[t.id] || []
    }));

    return NextResponse.json({ success: true, teachers: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
