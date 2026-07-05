// ============================================================
// /api/interns/list — List all interns
// Akses: Admin (semua field) ATAU Pembina (exclude raw_password)
// Compute: days_remaining, time_progress untuk setiap intern
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Admin: return semua field (termasuk raw_password + contact info untuk manajemen)
    // Pembina: exclude raw_password (security — tidak perlu lihat password peserta)
    //          tapi tetap bisa lihat contact info (email/whatsapp) untuk koordinasi
    const selectFields = admin
      ? 'id, name, school_origin, major, department, start_date, end_date, total_exp, streak_count, username, raw_password, is_active, certificate_unlocked, email, whatsapp, phone, photo_url, tags, created_at'
      : 'id, name, school_origin, major, department, start_date, end_date, total_exp, streak_count, username, is_active, certificate_unlocked, email, whatsapp, phone, photo_url, tags, created_at';

    const { data, error } = await supabase
      .from('interns')
      .select(selectFields)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute days_remaining + time_progress untuk setiap intern
    const enriched = (data || []).map((i: any) => ({
      ...i,
      time_progress: calculateTimeProgress(i.start_date, i.end_date),
      days_remaining: daysRemaining(i.end_date)
    }));

    return NextResponse.json({ success: true, interns: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
