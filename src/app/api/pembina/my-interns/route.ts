// ============================================================
// /api/pembina/my-interns — List peserta yang dibimbing pembina
// Query dari group_members → get intern profiles
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining } from '@/lib/utils';

export async function GET() {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // Get all groups where pembina is a member
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, group:groups(id, name, department)')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ success: true, interns: [] });
    }

    const groupIds = memberships.map((m: any) => m.group_id);

    // Get all peserta members from those groups
    const { data: pesertaMembers } = await supabase
      .from('group_members')
      .select('user_id, group_id')
      .eq('user_type', 'peserta')
      .in('group_id', groupIds);

    if (!pesertaMembers || pesertaMembers.length === 0) {
      return NextResponse.json({ success: true, interns: [] });
    }

    // Deduplicate intern IDs (peserta bisa ada di multiple grup)
    const internIds = [...new Set(pesertaMembers.map((m: any) => m.user_id))];

    // Get intern profiles
    const { data: interns } = await supabase
      .from('interns')
      .select('id, name, major, department, school_origin, total_exp, streak_count, is_active, start_date, end_date, photo_url')
      .in('id', internIds)
      .eq('is_active', true)
      .order('total_exp', { ascending: false });

    // Map intern → groups they're in (with this pembina)
    const internGroupMap: Record<string, string[]> = {};
    for (const m of pesertaMembers) {
      if (!internGroupMap[m.user_id]) internGroupMap[m.user_id] = [];
      const ms: any = memberships.find((ms: any) => ms.group_id === m.group_id);
      const groupName = Array.isArray(ms?.group) ? ms.group[0]?.name : ms?.group?.name;
      if (groupName) internGroupMap[m.user_id].push(groupName);
    }

    // Enrich with computed fields
    const enriched = (interns || []).map((i: any) => ({
      ...i,
      time_progress: calculateTimeProgress(i.start_date, i.end_date),
      days_remaining: daysRemaining(i.end_date),
      groups: [...new Set(internGroupMap[i.id] || [])],
    }));

    return NextResponse.json({ success: true, interns: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
