// ============================================================
// /api/pembina/me — Get current pembina profile
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

export async function GET() {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('pembina_magang')
      .select('id, pembina_id, email, name, phone, department, photo_url')
      .eq('id', pembina.pembina_id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ success: true, pembina: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
