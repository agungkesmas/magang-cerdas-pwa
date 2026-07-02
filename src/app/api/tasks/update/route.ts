// ============================================================
// /api/tasks/update — Admin update existing task
// Supports: edit title/description/target/due_date, edit assigned_interns, deactivate
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

const ALLOWED_FIELDS = ['title', 'department', 'base_description', 'target_count', 'due_date', 'is_active'];

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, assigned_intern_ids, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID task wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify task exists
    const { data: existing, error: fErr } = await supabase
      .from('tasks')
      .select('id, mode')
      .eq('id', id)
      .single();
    if (fErr || !existing) {
      return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
    }

    // Update scalar fields
    const cleanUpdates: Record<string, unknown> = {};
    for (const f of ALLOWED_FIELDS) {
      if (updates[f] !== undefined) {
        if (f === 'target_count') {
          cleanUpdates[f] = Math.max(1, parseInt(updates[f]) || 1);
        } else if (f === 'due_date') {
          cleanUpdates[f] = updates[f] ? new Date(updates[f]).toISOString() : null;
        } else if (f === 'is_active') {
          cleanUpdates[f] = !!updates[f];
        } else {
          cleanUpdates[f] = updates[f];
        }
      }
    }

    if (Object.keys(cleanUpdates).length > 0) {
      const { error: uErr } = await supabase.from('tasks').update(cleanUpdates).eq('id', id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    // Update assigned_interns (untuk mode assigned/team)
    if (Array.isArray(assigned_intern_ids)) {
      // Hapus semua assignment lama
      const { error: dErr } = await supabase.from('task_assignments').delete().eq('task_id', id);
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

      // Insert assignment baru
      if (assigned_intern_ids.length > 0) {
        // Verify all intern IDs exist
        const { data: validInterns } = await supabase
          .from('interns')
          .select('id')
          .in('id', assigned_intern_ids)
          .eq('is_active', true);
        if (!validInterns || validInterns.length !== assigned_intern_ids.length) {
          return NextResponse.json({ error: 'Satu atau lebih intern tidak valid' }, { status: 400 });
        }

        const rows = assigned_intern_ids.map((intern_id: string) => ({ task_id: id, intern_id }));
        const { error: iErr } = await supabase.from('task_assignments').insert(rows);
        if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
