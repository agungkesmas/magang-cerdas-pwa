// ============================================================
// /api/activities/list — List aktivitas
// Admin: semua aktivitas (with completion info)
// Intern: aktivitas yang assigned ke mereka (per-intern ATAU per-departemen mereka)
//
// Recurring mode:
//   - Aktivitas muncul untuk intern hanya jika today dalam range start_date..end_date
//   - Intern bisa complete 1x per hari (anti-double via UNIQUE constraint)
//   - my_daily_completion: status complete hari ini (untuk UI)
//   - my_progress: progress mingguan { completed_days, total_days }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getInternToken } from '@/lib/auth';

// Helper: hitung jumlah hari kerja dalam range (exclude weekend jika skip_weekend)
function countWorkingDays(start: Date, end: Date, skipWeekend: boolean): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setHours(0, 0, 0, 0);
  while (cur <= endCopy) {
    const day = cur.getDay(); // 0=Sun, 6=Sat
    if (skipWeekend && (day === 0 || day === 6)) {
      cur.setDate(cur.getDate() + 1);
      continue;
    }
    count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Helper: cek apakah today adalah hari kerja dalam range
function isTodayInRange(start: string | null, end: string | null, skipWeekend: boolean): boolean {
  if (!start || !end) return true; // tidak ada range = selalu tampil (backward compat)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sd = new Date(start);
  sd.setHours(0, 0, 0, 0);
  const ed = new Date(end);
  ed.setHours(0, 0, 0, 0);
  if (today < sd || today > ed) return false;
  if (skipWeekend) {
    const day = today.getDay();
    if (day === 0 || day === 6) return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const intern = await getInternToken();
    if (!admin && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const todayStr = new Date().toISOString().split('T')[0];

    if (admin && !intern) {
      // Admin: list SEMUA aktivitas (including archived) with completion info
      const { data: activities, error: aErr } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });
      if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

      const allActivities = activities || [];

      // Get completions untuk mode department (single completion)
      const { data: completions } = await supabase
        .from('activity_completions')
        .select('activity_id, intern_id, completed_at, interns!inner(name)')
        .in('activity_id', (allActivities || []).map((a) => a.id));

      const completionsMap: Record<string, any[]> = {};
      (completions || []).forEach((c: any) => {
        if (!completionsMap[c.activity_id]) completionsMap[c.activity_id] = [];
        completionsMap[c.activity_id].push({
          intern_id: c.intern_id,
          intern_name: c.interns?.name,
          completed_at: c.completed_at
        });
      });

      // Get daily completions (untuk mode recurring)
      const { data: dailyCompletions } = await supabase
        .from('activity_daily_completions')
        .select('activity_id, intern_id, completion_date, exp_awarded, bonus_exp_awarded, completed_at, interns!inner(name)')
        .in('activity_id', (allActivities || []).map((a) => a.id));

      const dailyCompletionsMap: Record<string, any[]> = {};
      (dailyCompletions || []).forEach((c: any) => {
        if (!dailyCompletionsMap[c.activity_id]) dailyCompletionsMap[c.activity_id] = [];
        dailyCompletionsMap[c.activity_id].push({
          intern_id: c.intern_id,
          intern_name: c.interns?.name,
          completion_date: c.completion_date,
          exp_awarded: c.exp_awarded,
          bonus_exp_awarded: c.bonus_exp_awarded,
          completed_at: c.completed_at
        });
      });

      // Get intern names untuk per-intern activities
      const internIds = (allActivities || []).filter((a) => a.intern_id).map((a) => a.intern_id);
      let internNamesMap: Record<string, string> = {};
      if (internIds.length > 0) {
        const { data: interns } = await supabase
          .from('interns')
          .select('id, name')
          .in('id', internIds);
        (interns || []).forEach((i: any) => {
          internNamesMap[i.id] = i.name;
        });
      }

      const result = (allActivities || []).map((a: any) => {
        const isRecurring = a.is_recurring;
        const todayInRange = isTodayInRange(a.start_date, a.end_date, a.skip_weekend);

        // Hitung progress hari ini
        let todayCompletions = 0;
        let totalTargetInterns = 0;
        if (isRecurring && dailyCompletionsMap[a.id]) {
          todayCompletions = dailyCompletionsMap[a.id].filter(
            (c) => c.completion_date === todayStr
          ).length;
        }

        return {
          ...a,
          assigned_intern_name: a.intern_id ? internNamesMap[a.intern_id] || 'Unknown' : null,
          completions: completionsMap[a.id] || [],
          daily_completions: dailyCompletionsMap[a.id] || [],
          completion_count: a.completed_by_intern_id ? 1 : (completionsMap[a.id]?.length || 0),
          today_completion_count: todayCompletions,
          is_today_in_range: todayInRange,
          working_days_in_range: a.start_date && a.end_date
            ? countWorkingDays(new Date(a.start_date), new Date(a.end_date), a.skip_weekend)
            : null
        };
      });

      return NextResponse.json({ success: true, activities: result });
    }

    // === INTERN VIEW ===
    const { data: internData } = await supabase
      .from('interns')
      .select('department')
      .eq('id', intern!.intern_id)
      .single();

    if (!internData) return NextResponse.json({ error: 'Intern tidak ditemukan' }, { status: 404 });

    const { data: activities, error: aErr } = await supabase
      .from('activities')
      .select('*')
      .eq('is_active', true)
      .or(`intern_id.eq.${intern!.intern_id},and(intern_id.is.null,department.eq.${internData.department})`)
      .order('created_at', { ascending: false });
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    // Filter archived di code
    const allActivities = (activities || []).filter((a: any) => !a.is_archived);

    // ============================================================
    // TAMBAHAN: Fetch Quests (is_quest=true) yang sudah dimulai/diselesaikan
    // oleh intern ini (via quest_logs)
    // ============================================================
    const { data: myQuestLogs } = await supabase
      .from('quest_logs')
      .select('quest_id, status, started_at, submitted_at, submission_notes, xp_awarded')
      .eq('intern_id', intern!.intern_id)
      .in('status', ['in_progress', 'completed']);

    const questLogMap: Record<string, any> = {};
    (myQuestLogs || []).forEach((ql: any) => {
      questLogMap[ql.quest_id] = ql;
    });

    const questIds = Object.keys(questLogMap);
    if (questIds.length > 0) {
      const { data: questActivities, error: qErr } = await supabase
        .from('activities')
        .select('*')
        .in('id', questIds)
        .eq('is_quest', true);
      if (qErr) console.error('[activities/list] quest fetch error:', qErr);

      if (questActivities && questActivities.length > 0) {
        // Merge Quests ke allActivities
        questActivities.forEach((qa: any) => {
          if (!qa.is_archived) {
            allActivities.push(qa);
          }
        });
      }
    }

    // Get single completions by this intern (mode lama)
    const { data: myCompletions } = await supabase
      .from('activity_completions')
      .select('activity_id, completed_at')
      .eq('intern_id', intern!.intern_id)
      .in('activity_id', (allActivities || []).map((a) => a.id));

    const myCompletionMap: Record<string, string | null> = {};
    (myCompletions || []).forEach((c: any) => {
      myCompletionMap[c.activity_id] = c.completed_at;
    });

    // Get daily completions by this intern (mode recurring)
    const { data: myDailyCompletions } = await supabase
      .from('activity_daily_completions')
      .select('activity_id, completion_date, exp_awarded, bonus_exp_awarded, completed_at, completion_notes')
      .eq('intern_id', intern!.intern_id)
      .in('activity_id', (allActivities || []).map((a) => a.id));

    const myDailyCompletionsMap: Record<string, any[]> = {};
    (myDailyCompletions || []).forEach((c: any) => {
      if (!myDailyCompletionsMap[c.activity_id]) myDailyCompletionsMap[c.activity_id] = [];
      myDailyCompletionsMap[c.activity_id].push(c);
    });

    const result = (allActivities || []).map((a: any) => {
      const isRecurring = a.is_recurring;
      const todayInRange = isTodayInRange(a.start_date, a.end_date, a.skip_weekend);

      // Untuk recurring: cek apakah sudah complete hari ini
      let completedToday = false;
      let todayCompletionData = null;
      if (isRecurring && myDailyCompletionsMap[a.id]) {
        todayCompletionData = myDailyCompletionsMap[a.id].find(
          (c) => c.completion_date === todayStr
        );
        completedToday = !!todayCompletionData;
      }

      // Hitung progress mingguan untuk recurring
      let progressCompletedDays = 0;
      let progressTotalDays = 0;
      if (isRecurring && a.start_date && a.end_date) {
        progressTotalDays = countWorkingDays(new Date(a.start_date), new Date(a.end_date), a.skip_weekend);
        progressCompletedDays = (myDailyCompletionsMap[a.id] || []).length;
      }

      // Cek apakah sudah lewat deadline harian (untuk recurring)
      let isPastDailyDeadline = false;
      if (isRecurring && a.daily_deadline_hour) {
        const now = new Date();
        // WIB = UTC+7
        const wibHour = (now.getUTCHours() + 7) % 24;
        isPastDailyDeadline = wibHour >= a.daily_deadline_hour;
      }

      return {
        ...a,
        my_completion: a.completed_by_intern_id === intern!.intern_id ? a.completed_at : (myCompletionMap[a.id] || null),
        is_completed: a.completed_by_intern_id === intern!.intern_id || !!myCompletionMap[a.id] || (questLogMap[a.id]?.status === 'completed'),
        is_overdue: a.due_date ? new Date(a.due_date).getTime() < Date.now() : false,
        // Recurring fields
        is_today_in_range: todayInRange,
        completed_today: completedToday,
        today_completion: todayCompletionData,
        progress_completed_days: progressCompletedDays,
        progress_total_days: progressTotalDays,
        is_past_daily_deadline: isPastDailyDeadline,
        my_daily_history: myDailyCompletionsMap[a.id] || [],
        // Quest fields
        is_quest: !!a.is_quest,
        quest_status: questLogMap[a.id]?.status || null,
        quest_started_at: questLogMap[a.id]?.started_at || null,
        quest_submitted_at: questLogMap[a.id]?.submitted_at || null,
        quest_xp_awarded: questLogMap[a.id]?.xp_awarded || null
      };
    });

    return NextResponse.json({ success: true, activities: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
