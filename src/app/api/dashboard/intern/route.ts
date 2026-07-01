// ============================================================
// /api/dashboard/intern — Aggregated data for intern dashboard
// Returns: profile, today's attendance, tasks, streak, leaderboard
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { calculateLevel, calculateTimeProgress, daysRemaining, internshipDuration } from '@/lib/utils';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get full intern profile
    const { data: profile } = await supabase
      .from('Interns')
      .select('*')
      .eq('id', intern.intern_id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile tidak ditemukan' }, { status: 404 });
    }

    // Today's attendance
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const { data: todayAtt } = await supabase
      .from('Attendance')
      .select('*')
      .eq('intern_id', intern.intern_id)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: true });

    // Tasks for this department
    const { data: tasks } = await supabase
      .from('Tasks')
      .select('*')
      .eq('department', profile.department)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // Task completions for this intern
    const { data: completions } = await supabase
      .from('Task_Completions')
      .select('*')
      .eq('intern_id', intern.intern_id);

    // Leaderboard (all active interns, top 10)
    const { data: leaderboard } = await supabase
      .from('Interns')
      .select('id, name, major, department, total_exp, streak_count')
      .eq('is_active', true)
      .order('total_exp', { ascending: false })
      .limit(10);

    // Active official
    const { data: official } = await supabase
      .from('Officials')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    // Certificate if unlocked
    let certificate = null;
    if (profile.certificate_id) {
      const { data: cert } = await supabase
        .from('Certificates')
        .select('*')
        .eq('id', profile.certificate_id)
        .single();
      certificate = cert;
    }

    // Recent nudges
    const { data: nudges } = await supabase
      .from('Nudges')
      .select('*')
      .eq('intern_id', intern.intern_id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        level_info: calculateLevel(profile.total_exp || 0),
        tier: (profile.total_exp || 0) >= 1000 ? 'Excellence' : (profile.total_exp || 0) >= 500 ? 'Competent' : 'Participation',
        time_progress: calculateTimeProgress(profile.start_date, profile.end_date),
        days_remaining: daysRemaining(profile.end_date),
        duration_days: internshipDuration(profile.start_date, profile.end_date)
      },
      today_attendance: todayAtt || [],
      tasks: tasks || [],
      completions: completions || [],
      leaderboard: leaderboard || [],
      official: official || null,
      certificate,
      nudges: nudges || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
