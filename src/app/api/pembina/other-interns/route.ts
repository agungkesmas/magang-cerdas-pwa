// ============================================================
// /api/pembina/other-interns — Peserta di luar bimbingan saya
//
// Return: peserta yang ada di grup yang sama dengan pembina TAPI
// tidak ada di "Grup yang Saya Bimbing" (bukan bimbingan langsung)
//
// Use case: pembina divisi A butuh bantuan peserta divisi B via grup
// diskusi cross-dept → setelah dibantu, pembina A kasih gift ke peserta B
//
// Filter: peserta aktif, ada minimal 1 grup yang sama dengan pembina
// (system group "Diskusi Magang All" otomatis membuat semua peserta eligible)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';
import { calculateTimeProgress, daysRemaining } from '@/lib/utils';

export async function GET() {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();

    // 1. Get all groups where pembina is a member
    const { data: myGroups } = await supabase
      .from('group_members')
      .select('group_id, group:groups(id, name, department, group_type)')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    if (!myGroups || myGroups.length === 0) {
      return NextResponse.json({ success: true, interns: [] });
    }

    const myGroupIds = myGroups.map((m: any) => m.group_id);

    // 2. Get "my interns" (peserta di grup department/event/project yang saya bimbing)
    //    — exclude grup sistem "Diskusi Magang All" karena itu grup diskusi umum
    const myBimbinganGroupIds = myGroups
      .filter((m: any) => {
        const g = Array.isArray(m.group) ? m.group[0] : m.group;
        return g?.group_type !== 'system' || g?.name !== 'Diskusi Magang All';
      })
      .map((m: any) => m.group_id);

    // 3. Get peserta IDs yang sudah di-bimbing langsung (untuk di-exclude)
    let myInternIds: string[] = [];
    if (myBimbinganGroupIds.length > 0) {
      const { data: myPesertaMembers } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('user_type', 'peserta')
        .in('group_id', myBimbinganGroupIds);
      myInternIds = [...new Set((myPesertaMembers || []).map((m: any) => m.user_id))];
    }

    // 4. Get all peserta members from ALL groups (termasuk Diskusi Magang All)
    const { data: otherMembers } = await supabase
      .from('group_members')
      .select('user_id, group_id')
      .eq('user_type', 'peserta')
      .in('group_id', myGroupIds);

    if (!otherMembers || otherMembers.length === 0) {
      return NextResponse.json({ success: true, interns: [] });
    }

    // 5. Deduplicate + exclude my interns
    const otherInternIds = [...new Set(
      otherMembers.map((m: any) => m.user_id).filter((id: string) => !myInternIds.includes(id))
    )];

    if (otherInternIds.length === 0) {
      return NextResponse.json({ success: true, interns: [] });
    }

    // 6. Get intern profiles
    const { data: interns } = await supabase
      .from('interns')
      .select('id, name, major, department, school_origin, total_exp, streak_count, is_active, start_date, end_date, photo_url')
      .in('id', otherInternIds)
      .eq('is_active', true)
      .order('total_exp', { ascending: false });

    // 7. Map intern → shared groups dengan pembina (untuk konteks)
    const internSharedGroupsMap: Record<string, string[]> = {};
    for (const m of otherMembers) {
      if (myInternIds.includes(m.user_id)) continue;
      if (!internSharedGroupsMap[m.user_id]) internSharedGroupsMap[m.user_id] = [];
      const ms: any = myGroups.find((g) => g.group_id === m.group_id);
      const groupName = Array.isArray(ms?.group) ? ms.group[0]?.name : ms?.group?.name;
      if (groupName && !internSharedGroupsMap[m.user_id].includes(groupName)) {
        internSharedGroupsMap[m.user_id].push(groupName);
      }
    }

    // 8. Enrich
    const enriched = (interns || []).map((i: any) => ({
      ...i,
      time_progress: calculateTimeProgress(i.start_date, i.end_date),
      days_remaining: daysRemaining(i.end_date),
      shared_groups: internSharedGroupsMap[i.id] || [],
      is_cross_department: i.department !== pembina.department
    }));

    return NextResponse.json({ success: true, interns: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
