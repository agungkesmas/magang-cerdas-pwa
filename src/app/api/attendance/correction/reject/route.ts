// ============================================================
// /api/attendance/correction/reject — Admin reject koreksi absen
// POST { correction_id, review_notes }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized — admin atau pembina only' }, { status: 401 });
    }
    const reviewerId = admin?.sub || pembina?.pembina_id;
    const reviewerName = admin?.name || pembina?.name || 'Pembina';
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { correction_id, review_notes } = await req.json();
    if (!correction_id) {
      return NextResponse.json({ error: 'correction_id wajib diisi' }, { status: 400 });
    }
    if (!review_notes?.trim()) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: correction, error: cErr } = await supabase
      .from('attendance_corrections')
      .select(`
        id,
        intern_id,
        correction_date,
        type,
        status,
        interns!inner(name)
      `)
      .eq('id', correction_id)
      .single();

    if (cErr || !correction) {
      return NextResponse.json({ error: 'Koreksi tidak ditemukan' }, { status: 404 });
    }

    if (correction.status !== 'pending') {
      return NextResponse.json({ error: `Koreksi sudah ${correction.status}` }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('attendance_corrections')
      .update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes.trim()
      })
      .eq('id', correction_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Nudge peserta
    const intern = correction.interns as any;
    await supabase.from('nudges').insert({
      intern_id: correction.intern_id,
      message: `❌ Koreksi ${correction.type} untuk tanggal ${correction.correction_date} Anda DITOLAK oleh admin/pembina. Alasan: ${review_notes.trim()}. Hubungi admin kalau ada pertanyaan.`,
      type: 'correction_rejected',
      created_by_type: 'admin',
      created_by_id: reviewerId,
      created_by_name: reviewerName
    });

    return NextResponse.json({
      success: true,
      message: `Koreksi ${correction.type} ${intern.name} tanggal ${correction.correction_date} DITOLAK. Nudge terkirim ke peserta.`,
      correction_id: correction.id
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
