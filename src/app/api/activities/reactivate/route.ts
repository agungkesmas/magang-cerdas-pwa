// ============================================================
// /api/activities/reactivate — Admin aktifkan kembali aktivitas yang diarsipkan
// Reset completions agar intern bisa mengerjakan ulang
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // Reset: set is_archived=false, is_active=true, clear completions
    const { error: uErr } = await supabase
      .from('activities')
      .update({
        is_archived: false,
        is_active: true,
        completed_by_intern_id: null,
        completed_at: null,
        completion_notes: null
      })
      .eq('id', id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Hapus semua activity_completions untuk activity ini (reset)
    const { error: dErr } = await supabase
      .from('activity_completions')
      .delete()
      .eq('activity_id', id);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
