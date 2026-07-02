// ============================================================
// /api/bkk/intern-detail — Detail view for one intern (BKK teacher)
// Returns: profile, attendance summary, logbook entries, task completion summary
// Excludes: photos, GPS coords, AI instructions, raw passwords
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining, internshipDuration, calculateLevel, formatDateID } from '@/lib/utils';

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

    // Verify this intern belongs to teacher's school
    const { data: intern, error: iErr } = await supabase
      .from('interns')
      .select('id, name, major, department, school_origin, start_date, end_date, total_exp, streak_count, is_active, certificate_unlocked, certificate_id, created_at')
      .eq('id', internId)
      .single();

    if (iErr || !intern) {
      return NextResponse.json({ error: 'Intern tidak ditemukan' }, { status: 404 });
    }

    if (intern.school_origin !== teacher.school_origin) {
      return NextResponse.json({ error: 'Akses ditolak: intern bukan dari sekolah Anda' }, { status: 403 });
    }

    // Fetch attendance summary (NO photo_url, NO lat/lng)
    const { data: att } = await supabase
      .from('attendance')
      .select('type, timestamp, is_within_geofence, distance_meters')
      .eq('intern_id', internId)
      .order('timestamp', { ascending: false })
      .limit(100);

    // Fetch logbook entries (full text — for teacher review)
    const { data: logbook } = await supabase
      .from('logbook')
      .select('id, entry_date, activity, learning_summary, difficulties, created_at')
      .eq('intern_id', internId)
      .order('entry_date', { ascending: false });

    // Fetch task completion summary (only counts, not AI instructions)
    const { data: completions } = await supabase
      .from('task_completions')
      .select('task_id, completed_count, last_completed_at, Tasks!inner(title, target_count, department)')
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

    // Compute attendance stats
    const checkIns = (att || []).filter((a) => a.type === 'Check-In');
    const checkOuts = (att || []).filter((a) => a.type === 'Check-Out');
    const durationDays = internshipDuration(intern.start_date, intern.end_date);

    // Compute last 7 days attendance
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
      logbook_entries: logbook || [],
      task_completions: (completions || []).map((c) => ({
        task_id: c.task_id,
        task_title: (c.Tasks as any)?.title,
        task_department: (c.Tasks as any)?.department,
        completed_count: c.completed_count,
        target_count: (c.Tasks as any)?.target_count,
        last_completed_at: c.last_completed_at
      })),
      certificate
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
