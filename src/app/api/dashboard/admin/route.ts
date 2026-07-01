// ============================================================
// /api/dashboard/admin — Aggregated data for admin dashboard
// Returns: interns list, today's attendance, stats, near-end interns
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining } from '@/lib/utils';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // All interns with progress info
    const { data: interns } = await supabase
      .from('Interns')
      .select('id, name, school_origin, major, department, start_date, end_date, total_exp, streak_count, is_active, certificate_unlocked, username, raw_password, created_at')
      .order('created_at', { ascending: false });

    // Today's attendance
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const { data: todayAtt } = await supabase
      .from('Attendance')
      .select('*, Interns!inner(name, major, department)')
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: false });

    // Interns near end (within 14 days)
    const now = new Date();
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const { data: nearEnd } = await supabase
      .from('Interns')
      .select('id, name, major, department, end_date, total_exp')
      .eq('is_active', true)
      .lte('end_date', fourteenDaysAhead.toISOString().split('T')[0])
      .order('end_date', { ascending: true });

    // All tasks
    const { data: tasks } = await supabase.from('Tasks').select('*').order('created_at', { ascending: false });

    // Active officials
    const { data: officials } = await supabase.from('Officials').select('*').order('is_active', { ascending: false });

    // Stats
    const checkedInToday = new Set((todayAtt || []).filter((a) => a.type === 'Check-In').map((a) => a.intern_id));
    const activeInterns = (interns || []).filter((i) => i.is_active);
    const totalExp = activeInterns.reduce((sum, i) => sum + (i.total_exp || 0), 0);

    // Compute time_progress for each intern
    const internsEnriched = (interns || []).map((i) => ({
      ...i,
      time_progress: calculateTimeProgress(i.start_date, i.end_date),
      days_remaining: daysRemaining(i.end_date)
    }));

    return NextResponse.json({
      success: true,
      stats: {
        total_interns: activeInterns.length,
        checked_in_today: checkedInToday.size,
        check_in_rate: activeInterns.length > 0 ? Math.round((checkedInToday.size / activeInterns.length) * 100) : 0,
        total_exp: totalExp,
        near_end_count: (nearEnd || []).length,
        total_tasks: (tasks || []).length,
        total_officials: (officials || []).length
      },
      interns: internsEnriched,
      today_attendance: todayAtt || [],
      near_end_interns: nearEnd || [],
      tasks: tasks || [],
      officials: officials || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
