// ============================================================
// /api/pembina/dm — Create or get DM group between pembina & intern
// POST: { intern_id } → create/get DM group, return group_id
// ============================================================
// Concept: auto-create grup with group_type='dm' containing
// exactly 2 members: pembina + intern. Reuse all existing
// chat infrastructure (chat_messages, realtime, file upload).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { intern_id } = await req.json();
    if (!intern_id) return NextResponse.json({ error: 'intern_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // Verify pembina & intern are in at least 1 shared group
    const { data: pembinaGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    const { data: internGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'peserta')
      .eq('user_id', intern_id);

    const pembinaGroupIds = (pembinaGroups || []).map((g: any) => g.group_id);
    const internGroupIds = (internGroups || []).map((g: any) => g.group_id);
    const hasSharedGroup = pembinaGroupIds.some((id: string) => internGroupIds.includes(id));

    if (!hasSharedGroup) {
      return NextResponse.json({ error: 'Peserta ini tidak ada di grup yang Anda bimbing' }, { status: 403 });
    }

    // Get intern name for DM group name
    const { data: intern } = await supabase
      .from('interns')
      .select('name, is_active')
      .eq('id', intern_id)
      .single();

    if (!intern) return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    if (!intern.is_active) return NextResponse.json({ error: 'Peserta tidak aktif' }, { status: 400 });

    // Check if DM group already exists between this pembina & intern
    const { data: existingDmGroups } = await supabase
      .from('group_members')
      .select('group_id, group:groups(id, name, group_type, is_active)')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    let existingGroupId: string | null = null;
    for (const m of (existingDmGroups || [])) {
      const g: any = m.group;
      if (!g || g.group_type !== 'dm') continue;

      const { data: internInGroup } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', g.id)
        .eq('user_type', 'peserta')
        .eq('user_id', intern_id)
        .maybeSingle();

      if (internInGroup) {
        existingGroupId = g.id;
        if (!g.is_active) {
          await supabase.from('groups').update({ is_active: true }).eq('id', g.id);
        }
        break;
      }
    }

    if (existingGroupId) {
      return NextResponse.json({ success: true, group_id: existingGroupId });
    }

    // Create new DM group
    const dmGroupName = `DM: ${pembina.name} ↔ ${intern.name}`;
    const { data: newGroup, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name: dmGroupName,
        description: `Pesan langsung antara ${pembina.name} dan ${intern.name}`,
        group_type: 'dm',
        department: null,
        created_by_type: 'pembina',
        created_by_id: pembina.pembina_id,
        created_by_name: pembina.name,
        is_active: true,
      })
      .select()
      .single();

    if (groupErr) return NextResponse.json({ error: groupErr.message }, { status: 500 });

    // Add both members
    const { error: memberErr } = await supabase.from('group_members').insert([
      {
        group_id: newGroup.id,
        user_type: 'pembina',
        user_id: pembina.pembina_id,
        role: 'group_admin',
        added_by_type: 'pembina',
        added_by_id: pembina.pembina_id,
      },
      {
        group_id: newGroup.id,
        user_type: 'peserta',
        user_id: intern_id,
        role: 'member',
        added_by_type: 'pembina',
        added_by_id: pembina.pembina_id,
      },
    ]);

    if (memberErr) {
      await supabase.from('groups').delete().eq('id', newGroup.id);
      return NextResponse.json({ error: memberErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, group_id: newGroup.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
