// ============================================================
// /api/activities/history — Intern's activity history (completed activities with notes)
// Support 4 sumber:
//   1. Per-intern single completion (mode lama)
//   2. Department-mode single completion (activity_completions)
//   3. Recurring daily completion (activity_daily_completions) — group by activity
//   4. Quest completion (quest_logs + activities dengan is_quest=true) — group by activity
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // 1. Per-intern activities yang sudah completed (mode lama)
    const { data: ownActivities, error: aErr } = await supabase
      .from('activities')
      .select('id, title, description, completion_notes, completed_at, created_at, created_by_intern, is_recurring, start_date, end_date')
      .eq('intern_id', intern.intern_id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    // 2. Department-mode single completions (exclude Quest — Quest punya entry sendiri)
    const { data: deptCompletions, error: cErr } = await supabase
      .from('activity_completions')
      .select('activity_id, completion_notes, completed_at, activities!inner(title, description, created_at, is_recurring, is_quest)')
      .eq('intern_id', intern.intern_id)
      .order('completed_at', { ascending: false });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    // 3. Recurring daily completions (group by activity)
    const { data: dailyCompletions, error: dErr } = await supabase
      .from('activity_daily_completions')
      .select('activity_id, completion_date, completion_notes, exp_awarded, bonus_exp_awarded, completed_at, activities!inner(title, description, created_at, is_recurring, start_date, end_date)')
      .eq('intern_id', intern.intern_id)
      .order('completed_at', { ascending: false });
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    // 4. Quest completions (quest_logs status=completed + activities is_quest=true)
    // NOTE: Jangan JOIN ke groups di sini karena ambiguous (quest_logs.group_id & activities.group_id
    // dua-duanya ke groups). Pakai query terpisah untuk ambil group info.
    let questCompletions: any[] = [];
    try {
      const { data: qData, error: qErr } = await supabase
        .from('quest_logs')
        .select(`
          quest_id,
          group_id,
          status,
          started_at,
          submitted_at,
          submission_notes,
          xp_awarded,
          activities!inner(title, description, created_at, is_quest, due_date, xp_reward)
        `)
        .eq('intern_id', intern.intern_id)
        .eq('status', 'completed')
        .order('submitted_at', { ascending: false });
      if (qErr) {
        console.error('[activities/history] quest_logs query error:', qErr);
        // Jangan throw — tetap return history lain (single, recurring)
      } else {
        questCompletions = qData || [];
      }
    } catch (qException) {
      console.error('[activities/history] quest_logs exception:', qException);
    }

    // Ambil group info terpisah (kalau ada quest completions)
    const groupIds = [...new Set(questCompletions.map((q: any) => q.group_id).filter(Boolean))];
    let groupMap: Record<string, { name: string; department: string | null }> = {};
    if (groupIds.length > 0) {
      const { data: groupData } = await supabase
        .from('groups')
        .select('id, name, department')
        .in('id', groupIds);
      (groupData || []).forEach((g: any) => {
        groupMap[g.id] = { name: g.name, department: g.department };
      });
    }

    // Track activity_id yang sudah masuk via activity_completions (supaya tidak duplikat)
    const deptActivityIds = new Set((deptCompletions || []).map((c: any) => c.activity_id));

    // Combine single completions (mode lama)
    const history: any[] = [];

    (ownActivities || []).forEach((a: any) => {
      if (!a.is_recurring) { // recurring punya entry sendiri di bawah
        history.push({
          id: a.id,
          activity_id: a.id,
          title: a.title,
          description: a.description,
          mode: 'single',
          completion_notes: a.completion_notes,
          completed_at: a.completed_at,
          created_at: a.created_at,
          source: a.created_by_intern ? 'self' : 'assigned',
          exp_gained: 20
        });
      }
    });

    (deptCompletions || []).forEach((c: any) => {
      const act = c.activities as any;
      if (act && !act.is_recurring && !act.is_quest) {
        history.push({
          id: c.activity_id,
          activity_id: c.activity_id,
          title: act.title,
          description: act.description,
          mode: 'single',
          completion_notes: c.completion_notes,
          completed_at: c.completed_at,
          created_at: act.created_at,
          source: 'department',
          exp_gained: 20
        });
      }
    });

    // Tambah Quest completions sebagai single entries dengan badge Quest
    (questCompletions || []).forEach((q: any) => {
      const act = q.activities as any;
      if (!act || !act.is_quest) return;
      // Skip kalau Quest ini sudah masuk via activity_completions (anti-duplikat)
      if (deptActivityIds.has(q.quest_id)) return;

      const grp = q.group_id ? groupMap[q.group_id] : null;

      history.push({
        id: q.quest_id,
        activity_id: q.quest_id,
        title: act.title,
        description: act.description,
        mode: 'quest',
        completion_notes: q.submission_notes,
        completed_at: q.submitted_at,
        started_at: q.started_at,
        created_at: act.created_at,
        source: 'quest',
        exp_gained: q.xp_awarded || act.xp_reward || 20,
        group_name: grp?.name || null,
        group_department: grp?.department || null,
        deadline: act.due_date || null
      });
    });

    // Group recurring completions by activity
    const recurringGroups: Record<string, any> = {};
    (dailyCompletions || []).forEach((c: any) => {
      const act = c.activities as any;
      if (!act) return;
      if (!recurringGroups[c.activity_id]) {
        recurringGroups[c.activity_id] = {
          id: c.activity_id,
          activity_id: c.activity_id,
          title: act.title,
          description: act.description,
          mode: 'recurring',
          start_date: act.start_date,
          end_date: act.end_date,
          created_at: act.created_at,
          source: 'recurring',
          daily_completions: [],
          total_exp_gained: 0,
          last_completed_at: c.completed_at
        };
      }
      recurringGroups[c.activity_id].daily_completions.push({
        completion_date: c.completion_date,
        completion_notes: c.completion_notes,
        exp_awarded: c.exp_awarded,
        bonus_exp_awarded: c.bonus_exp_awarded,
        completed_at: c.completed_at
      });
      recurringGroups[c.activity_id].total_exp_gained += (c.exp_awarded || 0) + (c.bonus_exp_awarded || 0);
    });

    const recurringHistory = Object.values(recurringGroups);
    // Sort recurring by last_completed_at
    recurringHistory.sort((a: any, b: any) => new Date(b.last_completed_at).getTime() - new Date(a.last_completed_at).getTime());

    // Sort single history
    history.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    return NextResponse.json({
      success: true,
      history, // single completions (includes quest)
      recurring_history: recurringHistory // recurring completions (grouped)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
