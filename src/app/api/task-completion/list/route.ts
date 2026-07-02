// ============================================================
// /api/task-completion/list — List completions for current intern
// Returns: own task_completions + team_progress_entries untuk team tasks
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // 1. Own completions (untuk mode individual & assigned)
    const { data: ownCompletions, error: oErr } = await supabase
      .from('task_completions')
      .select('*, tasks!inner(*)')
      .eq('intern_id', intern.intern_id);
    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

    // 2. Team tasks yang di-assign ke intern ini (shared progress)
    const { data: myAssignments } = await supabase
      .from('task_assignments')
      .select('task_id, tasks!inner(*)')
      .eq('intern_id', intern.intern_id)
      .eq('tasks.mode', 'team');

    const teamTaskIds = (myAssignments || []).map((a: any) => a.task_id);
    let teamProgressByTask: Record<string, any> = {};
    if (teamTaskIds.length > 0) {
      const { data: tp } = await supabase
        .from('task_team_progress')
        .select('task_id, chunk_index, completed_by_intern_id, completed_at, interns!inner(name)')
        .in('task_id', teamTaskIds);

      (tp || []).forEach((p: any) => {
        if (!teamProgressByTask[p.task_id]) teamProgressByTask[p.task_id] = [];
        teamProgressByTask[p.task_id].push({
          chunk_index: p.chunk_index,
          completed_by_intern_id: p.completed_by_intern_id,
          completed_by: p.interns?.name,
          completed_at: p.completed_at
        });
      });
    }

    return NextResponse.json({
      success: true,
      completions: ownCompletions || [],
      team_progress: teamProgressByTask
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
