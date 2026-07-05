// ============================================================
// /api/pembina/pending-attendances — List check-in/out yang butuh approval
//
// Logic:
// - Cari semua attendance dengan approval_status='pending' untuk peserta
//   yang ada di grup pembina ini
// - Group by peserta + tanggal untuk display yang compact
// - Return: list pending + count
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

export async function GET() {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // 1. Cari grup yang pembina ini anggota
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, pending: [], count: 0 });
    }

    const groupIds = memberships.map((m: any) => m.group_id);

    // 2. Cari peserta di grup-grup tersebut
    const { data: pesertaMembers } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('user_type', 'peserta')
      .in('group_id', groupIds);

    if (!pesertaMembers || pesertaMembers.length === 0) {
      return NextResponse.json({ success: true, pending: [], count: 0 });
    }

    const internIds = [...new Set(pesertaMembers.map((m: any) => m.user_id))];

    // 3. Cari attendance pending untuk peserta-peserta tersebut
    const { data: pendingAtt, error } = await supabase
      .from('attendance')
      .select(`
        id,
        intern_id,
        type,
        timestamp,
        is_holiday_checkin,
        notes,
        distance_meters,
        is_within_geofence,
        interns!inner(id, name, department, photo_url)
      `)
      .eq('approval_status', 'pending')
      .in('intern_id', internIds)
      .order('timestamp', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pending: pendingAtt || [],
      count: (pendingAtt || []).length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
