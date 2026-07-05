// ============================================================
// /api/groups/[id] — Detail grup + members
// GET: detail grup + list members (dengan nama)
// DELETE: hapus grup (soft delete: is_active = false)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getInternToken } from '@/lib/auth';

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    const intern = await getInternToken();
    if (!admin && !pembina && !intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Fetch group
    const { data: group, error: gErr } = await supabase
      .from('groups')
      .select('*')
      .eq('id', params.id)
      .single();
    if (gErr || !group) return NextResponse.json({ error: 'Grup tidak ditemukan' }, { status: 404 });

    // Verify access (kalau bukan admin, harus member)
    if (!admin) {
      const userId = pembina ? pembina.pembina_id : intern!.intern_id;
      const userType = pembina ? 'pembina' : 'peserta';
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', params.id)
        .eq('user_type', userType)
        .eq('user_id', userId)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });
      }
      (group as any).my_role = membership.role;
    }

    // Fetch members dengan nama
    const { data: members } = await supabase
      .from('group_members')
      .select('id, user_type, user_id, role, joined_at')
      .eq('group_id', params.id)
      .order('joined_at', { ascending: true });

    // Fetch names untuk pembina & peserta
    const pembinaIds = (members || []).filter((m) => m.user_type === 'pembina').map((m) => m.user_id);
    const internIds = (members || []).filter((m) => m.user_type === 'peserta').map((m) => m.user_id);

    let pembinaMap: Record<string, any> = {};
    let internMap: Record<string, any> = {};

    if (pembinaIds.length > 0) {
      const { data: pList } = await supabase
        .from('pembina_magang')
        .select('id, pembina_id, name, email, department, photo_url')
        .in('id', pembinaIds);
      (pList || []).forEach((p: any) => { pembinaMap[p.id] = p; });
    }
    if (internIds.length > 0) {
      const { data: iList } = await supabase
        .from('interns')
        .select('id, name, username, major, department, school_origin, photo_url')
        .in('id', internIds);
      (iList || []).forEach((i: any) => { internMap[i.id] = i; });
    }

    const membersEnriched = (members || []).map((m: any) => ({
      ...m,
      profile: m.user_type === 'pembina' ? pembinaMap[m.user_id] : internMap[m.user_id]
    }));

    return NextResponse.json({
      success: true,
      group,
      members: membersEnriched
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Verify access (kalau pembina, harus group_admin)
    if (pembina && !admin) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', params.id)
        .eq('user_type', 'pembina')
        .eq('user_id', pembina.pembina_id)
        .maybeSingle();
      if (!membership || membership.role !== 'group_admin') {
        return NextResponse.json({ error: 'Hanya group_admin yang bisa hapus grup' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('groups')
      .update({ is_active: false })
      .eq('id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
