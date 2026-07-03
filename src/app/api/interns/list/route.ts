// ============================================================
// /api/interns/list — List all interns
// Akses: Admin (semua field) ATAU Pembina (exclude raw_password)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Admin: return semua field (termasuk raw_password untuk manajemen)
    // Pembina: exclude raw_password (security — tidak perlu lihat password peserta)
    const selectFields = admin
      ? 'id, name, school_origin, major, department, start_date, end_date, total_exp, streak_count, username, raw_password, is_active, certificate_unlocked, created_at'
      : 'id, name, school_origin, major, department, start_date, end_date, total_exp, streak_count, username, is_active, certificate_unlocked, created_at';

    const { data, error } = await supabase
      .from('interns')
      .select(selectFields)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, interns: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
