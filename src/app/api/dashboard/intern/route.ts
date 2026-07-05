// ============================================================
// /api/dashboard/intern — Aggregated data for intern dashboard
// Returns: profile, today's attendance, tasks, streak, leaderboard
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { calculateLevel, calculateTimeProgress, daysRemaining, internshipDuration, calculateTier } from '@/lib/utils';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get full intern profile
    const { data: profile } = await supabase
      .from('interns')
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
      .from('attendance')
      .select('*')
      .eq('intern_id', intern.intern_id)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString())
      .order('timestamp', { ascending: true });

    // Leaderboard (all active interns, top 10)
    const { data: leaderboard } = await supabase
      .from('interns')
      .select('id, name, major, department, total_exp, streak_count')
      .eq('is_active', true)
      .order('total_exp', { ascending: false })
      .limit(10);

    // Active official
    const { data: official } = await supabase
      .from('officials')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    // Certificate if unlocked
    let certificate = null;
    if (profile.certificate_id) {
      const { data: cert } = await supabase
        .from('certificates')
        .select('*')
        .eq('id', profile.certificate_id)
        .single();
      certificate = cert;
    }

    // Recent nudges
    const { data: nudges } = await supabase
      .from('nudges')
      .select('*')
      .eq('intern_id', intern.intern_id)
      .order('created_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        level_info: calculateLevel(profile.total_exp || 0),
        tier: calculateTier(profile.total_exp || 0, profile.start_date, profile.end_date),
        time_progress: calculateTimeProgress(profile.start_date, profile.end_date),
        days_remaining: daysRemaining(profile.end_date),
        duration_days: internshipDuration(profile.start_date, profile.end_date)
      },
      today_attendance: todayAtt || [],
      leaderboard: leaderboard || [],
      official: official || null,
      certificate,
      nudges: nudges || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
