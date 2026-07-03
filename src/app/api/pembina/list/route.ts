// ============================================================
// /api/pembina/list — List semua pembina magang
// Akses: Admin (semua field) ATAU Pembina (exclude raw_password)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // Admin: return semua field (termasuk raw_password untuk manajemen)
    // Pembina: exclude raw_password (security — tidak perlu lihat password orang lain)
    const selectFields = admin
      ? 'id, pembina_id, email, name, phone, department, photo_url, raw_password, is_active, last_login_at, created_at'
      : 'id, pembina_id, email, name, phone, department, photo_url, is_active, last_login_at, created_at';

    const { data, error } = await supabase
      .from('pembina_magang')
      .select(selectFields)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, pembina: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
