// ============================================================
// /api/groups/create — Buat grup baru (admin atau pembina)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang'];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, group_type, department, member_pembina_ids, member_intern_ids } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nama grup wajib diisi' }, { status: 400 });
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Determine creator
    const creatorType = admin ? 'admin' : 'pembina';
    const creatorId = admin ? admin.sub : pembina!.pembina_id;
    const creatorName = admin ? admin.name : pembina!.name;

    // Insert group
    const { data: group, error: gErr } = await supabase
      .from('groups')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        group_type: group_type || 'department',
        department: department || null,
        created_by_type: creatorType,
        created_by_id: creatorId,
        created_by_name: creatorName,
        is_active: true
      })
      .select()
      .single();
    if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 });

    // Add creator as group_admin (jika pembina yang create)
    if (pembina) {
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_type: 'pembina',
        user_id: pembina.pembina_id,
        role: 'group_admin',
        added_by_type: 'pembina',
        added_by_id: pembina.pembina_id
      });
    }

    // Add pembina members (kalau ada)
    if (Array.isArray(member_pembina_ids) && member_pembina_ids.length > 0) {
      const inserts = member_pembina_ids.map((pid: string) => ({
        group_id: group.id,
        user_type: 'pembina' as const,
        user_id: pid,
        role: 'member' as const,
        added_by_type: creatorType,
        added_by_id: creatorId
      }));
      await supabase.from('group_members').insert(inserts);
    }

    // Add peserta members (kalau ada)
    if (Array.isArray(member_intern_ids) && member_intern_ids.length > 0) {
      const inserts = member_intern_ids.map((iid: string) => ({
        group_id: group.id,
        user_type: 'peserta' as const,
        user_id: iid,
        role: 'member' as const,
        added_by_type: creatorType,
        added_by_id: creatorId
      }));
      await supabase.from('group_members').insert(inserts);
    }

    return NextResponse.json({ success: true, group });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
