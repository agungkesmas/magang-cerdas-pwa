// ============================================================
// /api/groups/[id]/restore — Restore grup yang di-archived
// Set is_active = true kembali
// Hanya admin atau group_admin yang bisa restore
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Verify access (kalau pembina, harus group_admin grup ini)
    if (pembina && !admin) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', params.id)
        .eq('user_type', 'pembina')
        .eq('user_id', pembina.pembina_id)
        .maybeSingle();
      if (!membership || membership.role !== 'group_admin') {
        return NextResponse.json({ error: 'Hanya group_admin yang bisa restore grup' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('groups')
      .update({ is_active: true })
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
