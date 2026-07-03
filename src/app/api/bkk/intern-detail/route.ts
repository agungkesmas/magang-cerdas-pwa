// ============================================================
// /api/bkk/intern-detail — Detail view for one intern (BKK teacher)
// Returns: profile, attendance summary, activity history, task completion summary
// Privacy-filtered: NO photos, GPS, AI instructions, raw passwords
// Access control: intern's school_origin must be in teacher's schools[]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining, internshipDuration, calculateLevel } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const internId = searchParams.get('id');
    if (!internId) {
      return NextResponse.json({ error: 'id parameter wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch intern
    const { data: intern, error: iErr } = await supabase
      .from('interns')
      .select('id, name, major, department, school_origin, start_date, end_date, total_exp, streak_count, is_active, certificate_unlocked, certificate_id, created_at')
      .eq('id', internId)
      .single();

    if (iErr || !intern) {
      return NextResponse.json({ error: 'Intern tidak ditemukan' }, { status: 404 });
    }

    // Verify this intern's school is in teacher's linked schools
    if (!teacher.schools || !teacher.schools.includes(intern.school_origin)) {
      return NextResponse.json({ error: 'Akses ditolak: intern bukan dari sekolah yang Anda bimbing' }, { status: 403 });
    }

    // Fetch attendance summary (NO photo_url, NO lat/lng)
    const { data: att } = await supabase
      .from('attendance')
      .select('type, timestamp, is_within_geofence, distance_meters')
      .eq('intern_id', internId)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Fetch activity history (completed activities + quest completions)
    const { data: activityCompletions } = await supabase
      .from('activity_completions')
      .select('activity_id, completion_notes, completed_at, activities!inner(title, description, is_quest, xp_reward)')
      .eq('intern_id', internId)
      .order('completed_at', { ascending: false });

    const { data: questCompletions } = await supabase
      .from('quest_logs')
      .select('quest_id, submitted_at, submission_notes, xp_awarded, activities!inner(title, is_quest)')
      .eq('intern_id', internId)
      .eq('status', 'completed')
      .order('submitted_at', { ascending: false });

    // Merge into unified activity history
    const activityHistory: any[] = [];
    (activityCompletions || []).forEach((c: any) => {
      const act = c.activities as any;
      if (act && !act.is_quest) {
        activityHistory.push({
          title: act.title,
          description: act.description,
          completed_at: c.completed_at,
          notes: c.completion_notes,
          xp: act.xp_reward || 20,
          is_quest: false
        });
      }
    });
    (questCompletions || []).forEach((q: any) => {
      const act = q.activities as any;
      if (act && act.is_quest) {
        activityHistory.push({
          title: act.title,
          description: '',
          completed_at: q.submitted_at,
          notes: q.submission_notes,
          xp: q.xp_awarded || 20,
          is_quest: true
        });
      }
    });
    activityHistory.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    // Fetch task completion summary (lowercase relationship name for PostgREST)
    const { data: completions } = await supabase
      .from('task_completions')
      .select('task_id, completed_count, last_completed_at, tasks!inner(title, target_count, department)')
      .eq('intern_id', internId);

    // Fetch certificate if unlocked
    let certificate = null;
    if (intern.certificate_id) {
      const { data: cert } = await supabase
        .from('certificates')
        .select('verification_id, tier, issue_date')
        .eq('id', intern.certificate_id)
        .single();
      certificate = cert;
    }

    const checkIns = (att || []).filter((a) => a.type === 'Check-In');
    const checkOuts = (att || []).filter((a) => a.type === 'Check-Out');
    const durationDays = internshipDuration(intern.start_date, intern.end_date);

    // Last 7 days attendance
    const last7Days: { date: string; check_in: boolean; check_out: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const ci = checkIns.some((a) => a.timestamp?.startsWith(dateStr));
      const co = checkOuts.some((a) => a.timestamp?.startsWith(dateStr));
      last7Days.push({ date: dateStr, check_in: ci, check_out: co });
    }

    return NextResponse.json({
      success: true,
      intern: {
        ...intern,
        level_info: calculateLevel(intern.total_exp || 0),
        tier: (intern.total_exp || 0) >= 1000 ? 'Excellence' : (intern.total_exp || 0) >= 500 ? 'Competent' : 'Participation',
        time_progress: calculateTimeProgress(intern.start_date, intern.end_date),
        days_remaining: daysRemaining(intern.end_date),
        duration_days: durationDays
      },
      attendance_summary: {
        total_check_ins: checkIns.length,
        total_check_outs: checkOuts.length,
        last_attendance: att?.[0]?.timestamp || null,
        last_7_days: last7Days
      },
      activity_history: activityHistory,
      task_completions: (completions || []).map((c: any) => ({
        task_id: c.task_id,
        task_title: c.tasks?.title,
        task_department: c.tasks?.department,
        completed_count: c.completed_count,
        target_count: c.tasks?.target_count,
        last_completed_at: c.last_completed_at
      })),
      certificate
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
