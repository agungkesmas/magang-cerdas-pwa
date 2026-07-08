// ============================================================
// /api/attendance/correction/list — List koreksi absen
// Peserta: lihat koreksi sendiri
// Admin: lihat semua koreksi (atau filter by status)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken, getAdminToken, getPembinaToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const intern = await getInternToken();
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!intern && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // pending | approved | rejected

    const supabase = createServerClient();
    let query = supabase
      .from('attendance_corrections')
      .select(`
        id,
        intern_id,
        correction_date,
        type,
        reason,
        promise_not_repeat,
        status,
        reviewed_at,
        review_notes,
        created_at,
        interns!inner(name, department, username)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Peserta: hanya koreksi sendiri
    if (intern && !admin) {
      query = query.eq('intern_id', intern.intern_id);
    }

    const { data: corrections, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      corrections: corrections || []
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
