// ============================================================
// /api/admin/requests/[id] — Admin: detail & status transitions
// GET    → detail
// PUT    → respond: action in {review, accept, reject, complete}
//   body: { action, review_notes, accepted_slots, actual_start_date, actual_end_date, assigned_departments }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

interface Params {
  params: { id: string };
}

const VALID_ACTIONS = ['review', 'accept', 'reject', 'complete'] as const;
type Action = (typeof VALID_ACTIONS)[number];

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('internship_requests')
      .select(`
        *,
        bkk_teachers!inner(name, email, phone)
      `)
      .eq('id', params.id)
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
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action: Action = body.action;

    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: `action tidak valid. Harus salah satu: ${VALID_ACTIONS.join(', ')}` }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: existing } = await supabase
      .from('internship_requests')
      .select('id, status')
      .eq('id', params.id)
      .single();

    if (!existing) return NextResponse.json({ error: 'Permintaan tidak ditemukan' }, { status: 404 });

    const updateFields: any = {
      updated_at: new Date().toISOString(),
      reviewed_by: admin.sub,
      reviewed_at: new Date().toISOString(),
      review_notes: body.review_notes?.trim() || null
    };

    // State machine validation
    switch (action) {
      case 'review':
        // Move submitted → under_review
        if (existing.status !== 'submitted') {
          return NextResponse.json({ error: 'Hanya permintaan berstatus "submitted" yang bisa di-review' }, { status: 400 });
        }
        updateFields.status = 'under_review';
        break;

      case 'accept':
        // Move submitted|under_review → accepted
        if (!['submitted', 'under_review'].includes(existing.status)) {
          return NextResponse.json({ error: 'Hanya permintaan "submitted" atau "under_review" yang bisa diterima' }, { status: 400 });
        }
        if (body.accepted_slots && (body.accepted_slots < 1 || body.accepted_slots > 100)) {
          return NextResponse.json({ error: 'accepted_slots tidak valid' }, { status: 400 });
        }
        updateFields.status = 'accepted';
        if (body.accepted_slots) updateFields.accepted_slots = parseInt(body.accepted_slots, 10);
        if (body.actual_start_date) updateFields.actual_start_date = body.actual_start_date;
        if (body.actual_end_date) updateFields.actual_end_date = body.actual_end_date;
        if (body.assigned_departments) updateFields.assigned_departments = body.assigned_departments.trim();
        break;

      case 'reject':
        if (['accepted', 'completed', 'cancelled'].includes(existing.status)) {
          return NextResponse.json({ error: 'Permintaan sudah diterima/selesai — tidak bisa ditolak' }, { status: 400 });
        }
        if (!body.review_notes?.trim()) {
          return NextResponse.json({ error: 'Alasan penolakan wajib diisi (review_notes)' }, { status: 400 });
        }
        updateFields.status = 'rejected';
        break;

      case 'complete':
        if (existing.status !== 'accepted') {
          return NextResponse.json({ error: 'Hanya permintaan "accepted" yang bisa diselesaikan' }, { status: 400 });
        }
        updateFields.status = 'completed';
        break;
    }

    const { data, error } = await supabase
      .from('internship_requests')
      .update(updateFields)
      .eq('id', params.id)
      .select(`
        *,
        bkk_teachers!inner(name, email, phone)
      `)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, request: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
