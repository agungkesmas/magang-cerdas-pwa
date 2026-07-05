// ============================================================
// /api/dashboard/bkk — Aggregated data for BKK teacher dashboard
// Privacy-aware: only shows interns from teacher's linked schools
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining, internshipDuration, calculateTier } from '@/lib/utils';
import { ensureCustomHolidaysLoaded } from '@/lib/holidays-loader';

export async function GET() {
  try {
    const teacher = await getBKKToken();
    if (!teacher) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Load custom holidays untuk calculateTier dinamis
    await ensureCustomHolidaysLoaded();

    if (!teacher.schools || teacher.schools.length === 0) {
      return NextResponse.json({
        success: true,
        teacher: {
          name: teacher.name,
          email: teacher.email,
          schools: []
        },
        stats: {
          total_interns: 0,
          active_interns: 0,
          avg_exp: 0,
          certified_count: 0,
          near_end_count: 0
        },
        interns: [],
        warning: 'Akun BKK Anda belum di-link ke sekolah manapun. Hubungi admin untuk setup.'
      });
    }

    const supabase = createServerClient();

    // Get interns from all linked schools
    const { data: interns, error: iErr } = await supabase
      .from('interns')
      .select('id, name, major, department, school_origin, start_date, end_date, total_exp, streak_count, is_active, certificate_unlocked, certificate_id')
      .in('school_origin', teacher.schools)
      .order('created_at', { ascending: false });

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

    // For each intern, fetch attendance summary (count only, NO photos, NO GPS)
    const internIds = (interns || []).map((i) => i.id);
    let attendanceSummary: Record<string, { check_in_count: number; check_out_count: number; last_attendance: string | null }> = {};
    let activityCounts: Record<string, number> = {};

    if (internIds.length > 0) {
      const { data: att } = await supabase
        .from('attendance')
        .select('intern_id, type, timestamp')
        .in('intern_id', internIds)
        .order('timestamp', { ascending: false });

      attendanceSummary = (att || []).reduce((acc, row) => {
        if (!acc[row.intern_id]) acc[row.intern_id] = { check_in_count: 0, check_out_count: 0, last_attendance: null };
        if (row.type === 'Check-In') acc[row.intern_id].check_in_count++;
        if (row.type === 'Check-Out') acc[row.intern_id].check_out_count++;
        if (!acc[row.intern_id].last_attendance) acc[row.intern_id].last_attendance = row.timestamp;
        return acc;
      }, {} as Record<string, { check_in_count: number; check_out_count: number; last_attendance: string | null }>);

      // Count completed activities (activity_completions + quest_logs) instead of logbook
      const { data: actCompletions } = await supabase
        .from('activity_completions')
        .select('intern_id')
        .in('intern_id', internIds);
      activityCounts = (actCompletions || []).reduce((acc, row) => {
        acc[row.intern_id] = (acc[row.intern_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const { data: questCompletions } = await supabase
        .from('quest_logs')
        .select('intern_id')
        .eq('status', 'completed')
        .in('intern_id', internIds);
      (questCompletions || []).forEach((row: any) => {
        activityCounts[row.intern_id] = (activityCounts[row.intern_id] || 0) + 1;
      });
    }

    // Enrich interns with progress + summary
    const internsEnriched = (interns || []).map((i) => ({
      ...i,
      time_progress: calculateTimeProgress(i.start_date, i.end_date),
      days_remaining: daysRemaining(i.end_date),
      duration_days: internshipDuration(i.start_date, i.end_date),
      attendance: attendanceSummary[i.id] || { check_in_count: 0, check_out_count: 0, last_attendance: null },
      logbook_count: activityCounts[i.id] || 0, // keep field name for backward compat, but now counts activities
      tier: calculateTier(i.total_exp || 0, i.start_date, i.end_date)
    }));

    const totalInterns = internsEnriched.length;
    const activeInterns = internsEnriched.filter((i) => i.is_active).length;
    const totalExp = internsEnriched.reduce((sum, i) => sum + (i.total_exp || 0), 0);
    const avgExp = totalInterns > 0 ? Math.round(totalExp / totalInterns) : 0;
    const certifiedCount = internsEnriched.filter((i) => i.certificate_unlocked).length;
    const nearEndCount = internsEnriched.filter((i) => i.is_active && i.days_remaining <= 14).length;

    return NextResponse.json({
      success: true,
      teacher: {
        name: teacher.name,
        email: teacher.email,
        schools: teacher.schools
      },
      stats: {
        total_interns: totalInterns,
        active_interns: activeInterns,
        avg_exp: avgExp,
        certified_count: certifiedCount,
        near_end_count: nearEndCount
      },
      interns: internsEnriched
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
