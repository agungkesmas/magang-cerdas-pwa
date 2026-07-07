// ============================================================
// /api/groups/list — List groups
// Admin: semua grup
// Pembina: grup yang dia anggotanya
// Peserta: grup yang dia anggotanya
// Query param: ?status=active|archived|all (default: active)
//   - active: is_active = true
//   - archived: is_active = false
//   - all: semua
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const intern = await getInternToken();
    if (!admin && !pembina && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active'; // active | archived | all

    const supabase = createServerClient();

    // Build filter condition
    const filterActive = status === 'all' ? undefined : (status === 'archived' ? false : true);

    // Admin: semua grup
    if (admin && !pembina && !intern) {
      let query = supabase
        .from('groups')
        .select('*')
        .neq('group_type', 'dm'); // Hide DM groups from admin list
      if (filterActive !== undefined) query = query.eq('is_active', filterActive);
      const { data: groups, error } = await query.order('created_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Get member counts
      const groupIds = (groups || []).map((g) => g.id);
      let memberCounts: Record<string, { pembina: number; peserta: number }> = {};
      if (groupIds.length > 0) {
        const { data: members } = await supabase
          .from('group_members')
          .select('group_id, user_type')
          .in('group_id', groupIds);
        (members || []).forEach((m: any) => {
          if (!memberCounts[m.group_id]) memberCounts[m.group_id] = { pembina: 0, peserta: 0 };
          if (m.user_type === 'pembina') memberCounts[m.group_id].pembina++;
          else if (m.user_type === 'peserta') memberCounts[m.group_id].peserta++;
        });
      }

      const result = (groups || []).map((g) => ({
        ...g,
        pembina_count: memberCounts[g.id]?.pembina || 0,
        peserta_count: memberCounts[g.id]?.peserta || 0
      }));

      return NextResponse.json({ success: true, groups: result });
    }

    // Pembina or Intern: groups yang dia anggotanya
    const userType = pembina ? 'pembina' : 'peserta';
    const userId = pembina ? pembina.pembina_id : intern!.intern_id;

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id, role')
      .eq('user_type', userType)
      .eq('user_id', userId);

    const groupIds = (memberships || []).map((m) => m.group_id);
    if (groupIds.length === 0) {
      return NextResponse.json({ success: true, groups: [] });
    }

    let query = supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .neq('group_type', 'dm');
    if (filterActive !== undefined) query = query.eq('is_active', filterActive);
    const { data: groups, error } = await query.order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Get member counts
    let memberCounts: Record<string, { pembina: number; peserta: number }> = {};
    const { data: members } = await supabase
      .from('group_members')
      .select('group_id, user_type')
      .in('group_id', groupIds);
    (members || []).forEach((m: any) => {
      if (!memberCounts[m.group_id]) memberCounts[m.group_id] = { pembina: 0, peserta: 0 };
      if (m.user_type === 'pembina') memberCounts[m.group_id].pembina++;
      else if (m.user_type === 'peserta') memberCounts[m.group_id].peserta++;
    });

    const roleMap: Record<string, string> = {};
    (memberships || []).forEach((m: any) => { roleMap[m.group_id] = m.role; });

    const result = (groups || []).map((g) => ({
      ...g,
      pembina_count: memberCounts[g.id]?.pembina || 0,
      peserta_count: memberCounts[g.id]?.peserta || 0,
      my_role: roleMap[g.id] || 'member'
    }));

    return NextResponse.json({ success: true, groups: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
