// ============================================================
// /api/tasks/create — Admin creates a new task
// Supports 3 modes: 'individual' (per-dept), 'assigned' (pilih intern), 'team' (shared progress)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { Department, TaskMode } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];
const VALID_MODES: TaskMode[] = ['individual', 'assigned', 'team'];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, department, base_description, target_count, mode, assigned_intern_ids, due_date } = body;

    // Validation
    if (!title || !department || !base_description) {
      return NextResponse.json(
        { error: 'Field wajib: title, department, base_description' },
        { status: 400 }
      );
    }
    if (!VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }

    const taskMode: TaskMode = mode || 'individual';
    if (!VALID_MODES.includes(taskMode)) {
      return NextResponse.json({ error: `Mode harus salah satu: ${VALID_MODES.join(', ')}` }, { status: 400 });
    }

    // Validate assigned_intern_ids untuk mode assigned/team
    let validatedInternIds: string[] = [];
    if (taskMode === 'assigned' || taskMode === 'team') {
      if (!Array.isArray(assigned_intern_ids) || assigned_intern_ids.length === 0) {
        return NextResponse.json(
          { error: `Mode "${taskMode}" wajib pilih minimal 1 intern` },
          { status: 400 }
        );
      }
      // Verify all intern IDs exist
      const supabase = createServerClient();
      const { data: validInterns, error: vErr } = await supabase
        .from('interns')
        .select('id, name, major, department')
        .in('id', assigned_intern_ids)
        .eq('is_active', true);
      if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
      if (!validInterns || validInterns.length !== assigned_intern_ids.length) {
        return NextResponse.json({ error: 'Satu atau lebih intern tidak valid/aktif' }, { status: 400 });
      }
      validatedInternIds = validInterns.map((i) => i.id);
    }

    // Parse due_date (optional)
    let parsedDueDate: string | null = null;
    if (due_date) {
      const d = new Date(due_date);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Format due_date tidak valid' }, { status: 400 });
      }
      parsedDueDate = d.toISOString();
    }

    const supabase = createServerClient();

    // Insert task
    const { data: task, error: tErr } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        department,
        base_description: base_description.trim(),
        target_count: Math.max(1, parseInt(target_count) || 1),
        is_active: true,
        mode: taskMode,
        due_date: parsedDueDate,
        created_by: admin.sub
      })
      .select()
      .single();

    if (tErr) {
      console.error('[tasks/create] DB error:', tErr);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    // Insert assignments untuk mode assigned/team
    if (validatedInternIds.length > 0) {
      const assignmentRows = validatedInternIds.map((intern_id) => ({
        task_id: task.id,
        intern_id
      }));
      const { error: aErr } = await supabase.from('task_assignments').insert(assignmentRows);
      if (aErr) {
        console.error('[tasks/create] assignment error:', aErr);
        // Rollback: delete the task (cascade akan hapus assignments yang baru)
        await supabase.from('tasks').delete().eq('id', task.id);
        return NextResponse.json({ error: 'Gagal assign intern: ' + aErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, task });
  } catch (e: any) {
    console.error('[tasks/create] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
