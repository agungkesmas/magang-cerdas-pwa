// ============================================================
// /api/leave/approve — Admin approve pengajuan izin
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, review_notes } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID pengajuan wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    const { data: existing, error: fErr } = await supabase
      .from('leave_requests')
      .select('id, status, intern_id')
      .eq('id', id)
      .single();
    if (fErr || !existing) {
      return NextResponse.json({ error: 'Pengajuan tidak ditemukan' }, { status: 404 });
    }
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: 'Pengajuan sudah pernah di-review' }, { status: 400 });
    }

    const { error: uErr } = await supabase
      .from('leave_requests')
      .update({
        status: 'approved',
        reviewed_by: admin.sub,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes?.trim() || null
      })
      .eq('id', id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Kirim nudge ke intern bahwa izin approved
    await supabase.from('nudges').insert({
      intern_id: existing.intern_id,
      message: `Pengajuan izin Anda telah DISETUJUI. Streak Anda tidak akan terputus untuk periode izin tersebut. ✅`,
      type: 'leave_approved'
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
