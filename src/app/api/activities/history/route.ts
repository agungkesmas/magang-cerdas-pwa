// ============================================================
// /api/activities/history — Intern's activity history (completed activities with notes)
// Sekarang support 3 sumber:
//   1. Per-intern single completion (mode lama)
//   2. Department-mode single completion (activity_completions)
//   3. Recurring daily completion (activity_daily_completions) — group by activity
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

    // 2. Department-mode single completions
    const { data: deptCompletions, error: cErr } = await supabase
      .from('activity_completions')
      .select('activity_id, completion_notes, completed_at, activities!inner(title, description, created_at, is_recurring)')
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
      if (act && !act.is_recurring) {
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
      history, // single completions
      recurring_history: recurringHistory // recurring completions (grouped)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
