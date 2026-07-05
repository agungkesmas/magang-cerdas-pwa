// ============================================================
// /api/groups/[id]/members — Add/remove members
// POST: tambah member (admin atau group_admin)
// DELETE: hapus member
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

    const { user_type, user_id, role } = await req.json();
    if (!user_type || !user_id) {
      return NextResponse.json({ error: 'user_type dan user_id wajib diisi' }, { status: 400 });
    }
    if (!['pembina', 'peserta'].includes(user_type)) {
      return NextResponse.json({ error: 'user_type tidak valid' }, { status: 400 });
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
        return NextResponse.json({ error: 'Hanya group_admin yang bisa tambah member' }, { status: 403 });
      }
    }

    const creatorType = admin ? 'admin' : 'pembina';
    const creatorId = admin ? admin.sub : pembina!.pembina_id;

    const { error } = await supabase.from('group_members').insert({
      group_id: params.id,
      user_type,
      user_id,
      role: role || 'member',
      added_by_type: creatorType,
      added_by_id: creatorId
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User sudah menjadi member grup ini' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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

    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('member_id');
    if (!memberId) return NextResponse.json({ error: 'member_id wajib diisi' }, { status: 400 });

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
        return NextResponse.json({ error: 'Hanya group_admin yang bisa hapus member' }, { status: 403 });
      }
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('id', memberId)
      .eq('group_id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
