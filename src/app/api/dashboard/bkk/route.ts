// ============================================================
// /api/dashboard/bkk — Aggregated data for BKK teacher dashboard
// Privacy-aware: only shows interns from teacher's linked schools
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining, internshipDuration, calculateTier, getWIBTodayRange } from '@/lib/utils';
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
      activity_count: activityCounts[i.id] || 0, // P2-10: rename dari logbook_count, sekarang hitung activities
      logbook_count: activityCounts[i.id] || 0, // keep for backward compat (akan dihapus versi depan)
      tier: calculateTier(i.total_exp || 0, i.start_date, i.end_date)
    }));

    const totalInterns = internsEnriched.length;
    const activeInterns = internsEnriched.filter((i) => i.is_active).length;
    const totalExp = internsEnriched.reduce((sum, i) => sum + (i.total_exp || 0), 0);
    const avgExp = totalInterns > 0 ? Math.round(totalExp / totalInterns) : 0;
    const certifiedCount = internsEnriched.filter((i) => i.certificate_unlocked).length;
    const nearEndCount = internsEnriched.filter((i) => i.is_active && i.days_remaining <= 14).length;

    // ============================================================
    // TODAY SNAPSHOT — berapa peserta yang sudah check-in hari ini
    // ============================================================
    const { start: wibStart, end: wibEnd } = getWIBTodayRange();
    const activeInternIds = internsEnriched.filter(i => i.is_active).map(i => i.id);

    let todaySnapshot = {
      checked_in: 0,
      checked_out: 0,
      not_checked_in: activeInternIds.length,
      on_leave: 0,
      late_today: 0
    };

    if (activeInternIds.length > 0) {
      const { data: todayAtt } = await supabase
        .from('attendance')
        .select('intern_id, type, is_late')
        .in('intern_id', activeInternIds)
        .gte('timestamp', wibStart.toISOString())
        .lte('timestamp', wibEnd.toISOString());

      const ciIds = new Set<string>();
      const coIds = new Set<string>();
      const lateIds = new Set<string>();
      (todayAtt || []).forEach((a: any) => {
        if (a.type === 'Check-In') {
          ciIds.add(a.intern_id);
          if (a.is_late) lateIds.add(a.intern_id);
        }
        if (a.type === 'Check-Out') coIds.add(a.intern_id);
      });

      // Cek izin approved hari ini
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const { data: todayLeaves } = await supabase
        .from('leave_requests')
        .select('intern_id')
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .in('intern_id', activeInternIds);
      const leaveIds = new Set((todayLeaves || []).map((l: any) => l.intern_id));

      todaySnapshot = {
        checked_in: ciIds.size,
        checked_out: coIds.size,
        not_checked_in: activeInternIds.length - ciIds.size - leaveIds.size,
        on_leave: leaveIds.size,
        late_today: lateIds.size
      };
    }

    // At-risk: HANYA peserta aktif yang 0 check-in dalam 7 hari terakhir
    // (bukan berdasarkan total duration — itu bikin semua orang kena flag di awal magang)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentAtt } = await supabase
      .from('attendance')
      .select('intern_id')
      .eq('type', 'Check-In')
      .gte('timestamp', sevenDaysAgo.toISOString())
      .in('intern_id', activeInternIds);
    const recentCiIds = new Set((recentAtt || []).map((a: any) => a.intern_id));

    const atRiskCount = internsEnriched.filter(i => {
      if (!i.is_active) return false;
      // Hanya flag kalau magang sudah mulah (start_date <= today) dan 0 check-in 7 hari
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      return i.start_date <= todayStr && !recentCiIds.has(i.id);
    }).length;

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
        near_end_count: nearEndCount,
        at_risk_count: atRiskCount
      },
      today_snapshot: todaySnapshot,
      interns: internsEnriched
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
