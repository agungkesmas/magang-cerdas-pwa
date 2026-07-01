// ============================================================
// /api/task-completion/complete — Mark micro-quest chunk complete
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { EXP_REWARDS } from '@/lib/utils';
import { generateTaskInstruction } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { task_id, chunk_index } = await req.json();
    if (!task_id || chunk_index === undefined) {
      return NextResponse.json({ error: 'task_id dan chunk_index wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get task to know target_count and base_description
    const { data: task } = await supabase.from('Tasks').select('*').eq('id', task_id).single();
    if (!task) {
      return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
    }

    // Get or create Task_Completions record
    let { data: completion } = await supabase
      .from('Task_Completions')
      .select('*')
      .eq('intern_id', intern.intern_id)
      .eq('task_id', task_id)
      .eq('chunk_index', chunk_index)
      .maybeSingle();

    if (!completion) {
      // Generate AI instruction for this intern's major
      // Fetch intern major
      const { data: internData } = await supabase
        .from('Interns')
        .select('major')
        .eq('id', intern.intern_id)
        .single();
      const aiResult = await generateTaskInstruction(task.base_description, internData?.major || 'Umum');
      const { data: newCompletion, error } = await supabase
        .from('Task_Completions')
        .insert({
          intern_id: intern.intern_id,
          task_id,
          chunk_index,
          completed_count: 0,
          ai_instruction: aiResult.text
        })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      completion = newCompletion;
    }

    // Calculate chunk size
    const chunkSize = Math.max(1, Math.ceil(task.target_count / 10));
    const newCompleted = (completion.completed_count || 0) + chunkSize;

    // Grant EXP for completing a micro-quest
    const expGained = EXP_REWARDS.TASK_MICRO_CHUNK;
    const { data: internData } = await supabase
      .from('Interns')
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();
    const newTotalExp = (internData?.total_exp || 0) + expGained;

    await supabase
      .from('Task_Completions')
      .update({
        completed_count: newCompleted,
        last_completed_at: new Date().toISOString()
      })
      .eq('id', completion.id);

    await supabase.from('Interns').update({ total_exp: newTotalExp }).eq('id', intern.intern_id);

    // Check if full task complete (last chunk)
    const fullComplete = newCompleted >= task.target_count;
    let bonusExp = 0;
    if (fullComplete) {
      bonusExp = EXP_REWARDS.TASK_FULL_COMPLETE;
      await supabase
        .from('Interns')
        .update({ total_exp: newTotalExp + bonusExp })
        .eq('id', intern.intern_id);
    }

    return NextResponse.json({
      success: true,
      completed_count: Math.min(newCompleted, task.target_count),
      target_count: task.target_count,
      exp_gained: expGained + bonusExp,
      new_total_exp: newTotalExp + bonusExp,
      full_complete: fullComplete
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
