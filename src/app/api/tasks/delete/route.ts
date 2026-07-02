// ============================================================
// /api/tasks/delete — Admin delete task (soft delete via is_active=false OR hard delete)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const hard = searchParams.get('hard') === 'true';

    if (!id) {
      return NextResponse.json({ error: 'ID task wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify task exists
    const { data: existing } = await supabase.from('tasks').select('id, title').eq('id', id).single();
    if (!existing) {
      return NextResponse.json({ error: 'Task tidak ditemukan' }, { status: 404 });
    }

    if (hard) {
      // Hard delete: task_assignments, task_completions, task_team_progress akan auto-cascade
      const { error: dErr } = await supabase.from('tasks').delete().eq('id', id);
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });
    } else {
      // Soft delete: set is_active=false (task tetap ada di DB untuk history, tapi tidak tampil)
      const { error: uErr } = await supabase.from('tasks').update({ is_active: false }).eq('id', id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, hard_deleted: hard });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
