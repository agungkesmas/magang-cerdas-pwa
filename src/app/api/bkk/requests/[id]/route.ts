// ============================================================
// /api/bkk/requests/[id] — BKK teacher: detail / update / cancel
// GET    → detail
// PUT    → update (hanya untuk status 'draft' atau 'submitted' yang belum di-review)
// DELETE → cancel (set status jadi 'cancelled')
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('internship_requests')
      .select('*')
      .eq('id', params.id)
      .eq('bkk_teacher_id', teacher.teacher_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    // Verify ownership & editable status
    const { data: existing } = await supabase
      .from('internship_requests')
      .select('id, status, bkk_teacher_id')
      .eq('id', params.id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 });
    if (existing.bkk_teacher_id !== teacher.teacher_id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    if (!['draft', 'submitted'].includes(existing.status)) {
      return NextResponse.json({ error: 'Permintaan sudah diproses admin, tidak bisa diedit' }, { status: 400 });
    }

    const body = await req.json();
    const updateFields: any = { updated_at: new Date().toISOString() };

    // P3-16: 'status' TIDAK boleh di-edit oleh BKK (state machine harus via admin atau endpoint cancel)
    // BKK hanya bisa edit field konten permintaan selama masih draft/submitted
    const editable = [
      'school_name', 'request_title', 'contact_person', 'contact_phone', 'contact_email',
      'requested_slots', 'proposed_start_date', 'proposed_end_date',
      'requested_majors', 'requested_departments', 'cover_letter',
      'additional_notes', 'attachment_url'
    ];
    for (const f of editable) {
      if (body[f] !== undefined) updateFields[f] = body[f];
    }

    // P1-7: Validate school_name baru masih dalam daftar sekolah BKK (mencegah exploit pindah ke sekolah lain)
    if (updateFields.school_name !== undefined) {
      const newSchool = String(updateFields.school_name).trim();
      const schoolOk = !teacher.schools?.length || teacher.schools.includes(newSchool);
      if (!schoolOk) {
        return NextResponse.json(
          { error: 'Sekolah yang dipilih tidak terdaftar pada akun BKK Anda' },
          { status: 403 }
        );
      }
      updateFields.school_name = newSchool;
    }

    if (updateFields.requested_slots !== undefined) {
      const n = parseInt(updateFields.requested_slots, 10);
      if (isNaN(n) || n < 1 || n > 100) {
        return NextResponse.json({ error: 'Jumlah slot tidak valid' }, { status: 400 });
      }
      updateFields.requested_slots = n;
    }

    const { data, error } = await supabase
      .from('internship_requests')
      .update(updateFields)
      .eq('id', params.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, request: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  // DELETE = soft cancel (set status jadi 'cancelled', bukan hard delete)
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from('internship_requests')
      .select('id, status, bkk_teacher_id')
      .eq('id', params.id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 });
    if (existing.bkk_teacher_id !== teacher.teacher_id) {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
    }
    if (['accepted', 'completed'].includes(existing.status)) {
      return NextResponse.json({ error: 'Permintaan yang sudah diterima tidak bisa dibatalkan. Hubungi admin BPJTK.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('internship_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH untuk cancel (sama seperti DELETE tapi lebih RESTful)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    if (body.action === 'cancel') {
      const supabase = createServerClient();
      const { data: existing } = await supabase
        .from('internship_requests')
        .select('id, status, bkk_teacher_id')
        .eq('id', params.id)
        .single();

      if (!existing) return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 });
      if (existing.bkk_teacher_id !== teacher.teacher_id) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      if (['accepted', 'completed'].includes(existing.status)) {
        return NextResponse.json({ error: 'Permintaan yang sudah diterima tidak bisa dibatalkan' }, { status: 400 });
      }

      const { error } = await supabase
        .from('internship_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', params.id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      return NextResponse.json({ success: true, message: 'Permintaan dibatalkan' });
    }

    return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
