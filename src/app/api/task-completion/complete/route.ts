// ============================================================
// /api/task-completion/complete — Mark micro-quest chunk complete
// Anti-exploit: validate task active, department/assignment match, chunk not yet completed, target not yet reached
// Support 3 modes:
//   - individual: progress per-intern di task_completions
//   - assigned: progress per-intern di task_completions (sama seperti individual, tapi hanya assigned interns)
//   - team: shared progress di task_team_progress (1 chunk hanya bisa di-complete 1x oleh siapapun)
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
    if (!task_id || chunk_index === undefined || chunk_index === null) {
      return NextResponse.json({ error: 'task_id dan chunk_index wajib diisi' }, { status: 400 });
    }

    if (chunk_index < 0 || chunk_index > 100) {
      return NextResponse.json({ error: 'chunk_index tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    // ============================================================
    // 1. Fetch task & validate
    // ============================================================
    const { data: task, error: tErr } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();
    if (tErr || !task) {
      return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
    }
    if (!task.is_active) {
      return NextResponse.json({ error: 'Task sudah tidak aktif' }, { status: 400 });
    }

    // Check due_date
    if (task.due_date) {
      const due = new Date(task.due_date).getTime();
      if (Date.now() > due) {
        return NextResponse.json({ error: 'Task sudah melewati deadline' }, { status: 400 });
      }
    }

    // ============================================================
    // 2. Check access (department for individual, assignment for assigned/team)
    // ============================================================
    let hasAccess = false;
    if (task.mode === 'individual') {
      hasAccess = task.department === intern.department;
    } else {
      // assigned or team: check task_assignments
      const { data: assignment } = await supabase
        .from('task_assignments')
        .select('id')
        .eq('task_id', task_id)
        .eq('intern_id', intern.intern_id)
        .maybeSingle();
      hasAccess = !!assignment;
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Anda tidak punya akses ke task ini' }, { status: 403 });
    }

    // ============================================================
    // 3. Calculate chunk size + total chunks
    // ============================================================
    const chunkSize = Math.max(1, Math.ceil(task.target_count / 10));
    const totalChunks = Math.max(1, Math.ceil(task.target_count / chunkSize));

    if (chunk_index >= totalChunks) {
      return NextResponse.json({ error: `chunk_index maksimal ${totalChunks - 1}` }, { status: 400 });
    }

    // ============================================================
    // 4. Mode-specific completion logic
    // ============================================================
    let newCompleted: number;
    let fullComplete = false;
    let bonusExp = 0;
    let expGained = EXP_REWARDS.TASK_MICRO_CHUNK;
    let teamCompletedBy: string | null = null;

    if (task.mode === 'team') {
      // SHARED PROGRESS: 1 chunk = 1 record di task_team_progress
      // UNIQUE(task_id, chunk_index) mencegah double-complete di DB level

      // Cek apakah chunk ini sudah pernah di-complete
      const { data: existing } = await supabase
        .from('task_team_progress')
        .select('id, completed_by_intern_id, interns!inner(name)')
        .eq('task_id', task_id)
        .eq('chunk_index', chunk_index)
        .maybeSingle();

      if (existing) {
        const completedByName = Array.isArray(existing.interns)
          ? existing.interns[0]?.name
          : (existing.interns as any)?.name;
        return NextResponse.json(
          {
            error: `Chunk ${chunk_index + 1} sudah dikerjakan oleh ${completedByName || 'anggota tim lain'}`
          },
          { status: 409 }
        );
      }

      // Insert new team progress
      const { error: insErr } = await supabase
        .from('task_team_progress')
        .insert({
          task_id,
          chunk_index,
          completed_by_intern_id: intern.intern_id
        });

      if (insErr) {
        // Race condition: kemungkinan insert barengan dengan intern lain
        if (insErr.code === '23505') {
          return NextResponse.json(
            { error: 'Chunk baru saja dikerjakan anggota tim lain. Refresh halaman.' },
            { status: 409 }
          );
        }
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }

      // Hitung total chunks yang sudah completed
      const { data: allProgress, error: pErr } = await supabase
        .from('task_team_progress')
        .select('chunk_index')
        .eq('task_id', task_id);
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

      newCompleted = (allProgress?.length || 0) * chunkSize;
      newCompleted = Math.min(newCompleted, task.target_count);
      fullComplete = (allProgress?.length || 0) >= totalChunks;
      if (fullComplete) {
        bonusExp = EXP_REWARDS.TASK_FULL_COMPLETE;
      }
    } else {
      // INDIVIDUAL or ASSIGNED: per-intern progress di task_completions

      // Cari existing row
      const { data: completion } = await supabase
        .from('task_completions')
        .select('*')
        .eq('intern_id', intern.intern_id)
        .eq('task_id', task_id)
        .eq('chunk_index', chunk_index)
        .maybeSingle();

      // ANTI-EXPLOIT: jika row sudah ada dengan completed_count > 0, chunk ini sudah pernah di-complete
      if (completion && completion.completed_count > 0) {
        return NextResponse.json(
          { error: `Chunk ${chunk_index + 1} sudah pernah Anda kerjakan` },
          { status: 409 }
        );
      }

      // Cek apakah task sudah full complete (by total chunks done across all chunk_indexes)
      const { data: allMyCompletions } = await supabase
        .from('task_completions')
        .select('chunk_index, completed_count')
        .eq('intern_id', intern.intern_id)
        .eq('task_id', task_id);
      const myDoneChunks = (allMyCompletions || []).filter((c) => c.completed_count > 0).length;
      if (myDoneChunks >= totalChunks) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan semua chunk task ini' }, { status: 400 });
      }

      // Cek urutan: hanya chunk berikutnya yang boleh (tidak boleh skip)
      // Hitung chunk_index yang seharusnya berikutnya
      const doneChunkIndexes = (allMyCompletions || [])
        .filter((c) => c.completed_count > 0)
        .map((c) => c.chunk_index);
      const nextExpectedChunk = doneChunkIndexes.length === 0
        ? 0
        : Math.max(...doneChunkIndexes) + 1;
      if (chunk_index !== nextExpectedChunk) {
        return NextResponse.json(
          { error: `Anda harus kerjakan chunk ${nextExpectedChunk + 1} terlebih dahulu` },
          { status: 400 }
        );
      }

      // Insert atau update row
      if (!completion) {
        // Buat row baru dengan ai_instruction (cache)
        const { data: internData } = await supabase
          .from('interns')
          .select('major')
          .eq('id', intern.intern_id)
          .single();
        const aiResult = await generateTaskInstruction(task.base_description, internData?.major || 'Umum');
        const { error: insErr } = await supabase.from('task_completions').insert({
          intern_id: intern.intern_id,
          task_id,
          chunk_index,
          completed_count: chunkSize,
          last_completed_at: new Date().toISOString(),
          ai_instruction: aiResult.text
        });
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      } else {
        // Update row yang ada (completed_count sebelumnya 0, sekarang jadi chunkSize)
        const { error: uErr } = await supabase
          .from('task_completions')
          .update({
            completed_count: chunkSize,
            last_completed_at: new Date().toISOString()
          })
          .eq('id', completion.id);
        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
      }

      newCompleted = (myDoneChunks + 1) * chunkSize;
      newCompleted = Math.min(newCompleted, task.target_count);
      fullComplete = myDoneChunks + 1 >= totalChunks;
      if (fullComplete) {
        bonusExp = EXP_REWARDS.TASK_FULL_COMPLETE;
      }
    }

    // ============================================================
    // 5. Update intern EXP
    // ============================================================
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();
    const newTotalExp = (internData?.total_exp || 0) + expGained + bonusExp;
    await supabase.from('interns').update({ total_exp: newTotalExp }).eq('id', intern.intern_id);

    return NextResponse.json({
      success: true,
      completed_count: newCompleted,
      target_count: task.target_count,
      exp_gained: expGained + bonusExp,
      new_total_exp: newTotalExp,
      full_complete: fullComplete,
      mode: task.mode,
      chunk_index,
      team_completed_by: teamCompletedBy
    });
  } catch (e: any) {
    console.error('[task-completion/complete] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
