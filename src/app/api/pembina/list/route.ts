// ============================================================
// /api/pembina/list — Admin: list semua pembina magang
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('pembina_magang')
      .select('id, pembina_id, email, name, phone, department, photo_url, raw_password, is_active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, pembina: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
