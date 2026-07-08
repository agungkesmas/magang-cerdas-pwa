// ============================================================
// /api/attendance/early-leave/reject — Admin reject izin pulang cepat
// POST { request_id, review_notes }
// Flag is_early tetap, nudge peserta
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { request_id, review_notes } = await req.json();
    if (!request_id) {
      return NextResponse.json({ error: 'request_id wajib diisi' }, { status: 400 });
    }
    if (!review_notes?.trim()) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: request, error: rErr } = await supabase
      .from('early_leave_requests')
      .select(`
        id,
        intern_id,
        request_date,
        status,
        interns!inner(name)
      `)
      .eq('id', request_id)
      .single();

    if (rErr || !request) {
      return NextResponse.json({ error: 'Request tidak ditemukan' }, { status: 404 });
    }
    if (request.status !== 'pending') {
      return NextResponse.json({ error: `Request sudah ${request.status}` }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from('early_leave_requests')
      .update({
        status: 'rejected',
        reviewed_by: admin.sub,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes.trim()
      })
      .eq('id', request_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    const intern = request.interns as any;
    await supabase.from('nudges').insert({
      intern_id: request.intern_id,
      message: `❌ Izin pulang cepat tanggal ${request.request_date} DITOLAK. Flag "pulang awal" tetap berlaku. Alasan: ${review_notes.trim()}.`,
      type: 'early_leave_rejected',
      created_by_type: 'admin',
      created_by_id: admin.sub,
      created_by_name: admin.name
    });

    return NextResponse.json({
      success: true,
      message: `Izin pulang cepat ${intern.name} tanggal ${request.request_date} DITOLAK.`,
      request_id: request.id
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
