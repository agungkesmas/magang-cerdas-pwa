// ============================================================
// /api/attendance/early-leave/list — List izin pulang cepat
// Peserta: lihat sendiri. Admin: lihat semua.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken, getAdminToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const intern = await getInternToken();
    const admin = await getAdminToken();
    if (!intern && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    const supabase = createServerClient();
    let query = supabase
      .from('early_leave_requests')
      .select(`
        id,
        intern_id,
        attendance_id,
        request_date,
        actual_checkout_time,
        reason,
        status,
        review_notes,
        reviewed_at,
        created_at,
        interns!inner(name, department, username)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter) query = query.eq('status', statusFilter);
    if (intern && !admin) query = query.eq('intern_id', intern.intern_id);

    const { data: requests, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, requests: requests || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
