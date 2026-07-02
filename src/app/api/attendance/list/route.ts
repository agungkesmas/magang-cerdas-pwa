// ============================================================
// /api/attendance/list — List attendance records
// Admin: query by intern_id, Intern: own records only
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const internIdParam = searchParams.get('intern_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createServerClient();
    let query = supabase
      .from('attendance')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (admin && internIdParam) {
      query = query.eq('intern_id', internIdParam);
    } else if (intern && !admin) {
      query = query.eq('intern_id', intern.intern_id);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For admin: also join intern names
    if (admin) {
      const internIds = [...new Set((data || []).map((a) => a.intern_id))];
      if (internIds.length > 0) {
        const { data: interns } = await supabase
          .from('interns')
          .select('id, name, major, department')
          .in('id', internIds);
        const internMap = new Map((interns || []).map((i) => [i.id, i]));
        data?.forEach((a) => {
          (a as any).intern = internMap.get(a.intern_id);
        });
      }
    }

    return NextResponse.json({ success: true, attendance: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
