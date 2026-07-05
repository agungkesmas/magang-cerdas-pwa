// ============================================================
// /api/leave/list — List pengajuan izin
// Admin: semua pengajuan (with intern name)
// Intern: pengajuan sendiri
// BKK: pengajuan dari interns di sekolah yang dibimbing
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken, getBKKToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    const bkk = await getBKKToken();
    if (!admin && !intern && !bkk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // pending/approved/rejected
    const todayOnly = searchParams.get('today') === 'true';

    const supabase = createServerClient();
    let query = supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    if (todayOnly) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lte('start_date', today).gte('end_date', today);
    }

    // Filter berdasarkan role
    let targetInternIds: string[] | null = null;

    if (intern && !admin && !bkk) {
      query = query.eq('intern_id', intern.intern_id);
    } else if (bkk && !admin) {
      // BKK: hanya interns dari sekolah yang dibimbing
      const { data: interns } = await supabase
        .from('interns')
        .select('id')
        .in('school_origin', bkk.schools);
      targetInternIds = (interns || []).map((i: any) => i.id);
      if (targetInternIds.length === 0) {
        return NextResponse.json({ success: true, leave_requests: [] });
      }
      query = query.in('intern_id', targetInternIds);
    }
    // Admin: no filter (lihat semua)

    const { data: leaveRequests, error } = await query.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // For admin/bkk: join intern names
    let internNamesMap: Record<string, { name: string; major: string; department: string; school_origin: string }> = {};
    if ((admin || bkk) && leaveRequests && leaveRequests.length > 0) {
      const internIds = [...new Set(leaveRequests.map((lr: any) => lr.intern_id))];
      const { data: interns } = await supabase
        .from('interns')
        .select('id, name, major, department, school_origin')
        .in('id', internIds);
      (interns || []).forEach((i: any) => {
        internNamesMap[i.id] = { name: i.name, major: i.major, department: i.department, school_origin: i.school_origin };
      });
    }

    const result = (leaveRequests || []).map((lr: any) => ({
      ...lr,
      intern: internNamesMap[lr.intern_id] || null
    }));

    return NextResponse.json({ success: true, leave_requests: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
