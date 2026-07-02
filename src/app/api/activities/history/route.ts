// ============================================================
// /api/activities/history — Intern's activity history (completed activities with notes)
// Bisa dipakai sebagai acuan logbook manual
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // 1. Per-intern activities yang sudah completed
    const { data: ownActivities, error: aErr } = await supabase
      .from('activities')
      .select('id, title, description, completion_notes, completed_at, created_at, created_by_intern')
      .eq('intern_id', intern.intern_id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false });
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    // 2. Department-mode activities yang intern ini sudah complete (via activity_completions)
    const { data: deptCompletions, error: cErr } = await supabase
      .from('activity_completions')
      .select('activity_id, completion_notes, completed_at, activities!inner(title, description, created_at)')
      .eq('intern_id', intern.intern_id)
      .order('completed_at', { ascending: false });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    // Combine both into unified history
    const history: any[] = [];

    (ownActivities || []).forEach((a: any) => {
      history.push({
        id: a.id,
        title: a.title,
        description: a.description,
        completion_notes: a.completion_notes,
        completed_at: a.completed_at,
        created_at: a.created_at,
        source: a.created_by_intern ? 'self' : 'assigned'
      });
    });

    (deptCompletions || []).forEach((c: any) => {
      const act = c.activities as any;
      if (act) {
        history.push({
          id: c.activity_id,
          title: act.title,
          description: act.description,
          completion_notes: c.completion_notes,
          completed_at: c.completed_at,
          created_at: act.created_at,
          source: 'department'
        });
      }
    });

    // Sort by completed_at desc
    history.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

    return NextResponse.json({ success: true, history });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
