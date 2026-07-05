// ============================================================
// /api/pembina/active-quests — List semua quest/tugas aktif untuk pembina
//
// Return 2 jenis:
// 1. Quest grup (is_quest=true, is_active=true) dari grup yang pembina anggota
// 2. Tugas individual (intern_id NOT NULL, is_active=true, created_by_pembina_id=pembina)
//
// Dipakai di /pembina/home StatCard "Quest Aktif" + list yang bisa diklik
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

    // === 1. Cari grup yang pembina ini anggota ===
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    const groupIds = (memberships || []).map((m: any) => m.group_id);

    // === 2. Quest grup aktif (is_quest=true, is_active=true) ===
    let groupQuests: any[] = [];
    if (groupIds.length > 0) {
      const { data: gq, error: gqErr } = await supabase
        .from('activities')
        .select(`
          id, title, description, is_active, is_recurring,
          due_date, start_date, end_date, created_at,
          group_id,
          groups!inner(id, name, department)
        `)
        .eq('is_quest', true)
        .eq('is_active', true)
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });

      if (gqErr) console.error('[active-quests] group quests err:', gqErr);
      groupQuests = (gq || []).map((q: any) => {
        const group = Array.isArray(q.groups) ? q.groups[0] : q.groups;
        return {
          id: q.id,
          title: q.title,
          description: q.description,
          type: 'group',
          is_recurring: q.is_recurring,
          due_date: q.due_date,
          start_date: q.start_date,
          end_date: q.end_date,
          created_at: q.created_at,
          group_id: q.group_id,
          group_name: group?.name || 'Grup',
          group_department: group?.department,
          href: `/pembina/chat/${q.group_id}`
        };
      });
    }

    // === 3. Tugas individual aktif (intern_id NOT NULL, created_by_pembina_id=pembina) ===
    const { data: iq, error: iqErr } = await supabase
      .from('activities')
      .select(`
        id, title, description, is_active, is_recurring,
        due_date, start_date, end_date, created_at,
        intern_id,
        interns!inner(id, name, department, major)
      `)
      .eq('is_quest', false)
      .eq('is_active', true)
      .eq('created_by_pembina_id', pembina.pembina_id)
      .is('intern_id', 'not.null')
      .order('created_at', { ascending: false });

    if (iqErr) console.error('[active-quests] individual quests err:', iqErr);
    const individualQuests = (iq || []).map((q: any) => {
      const intern = Array.isArray(q.interns) ? q.interns[0] : q.interns;
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        type: 'individual',
        is_recurring: q.is_recurring,
        due_date: q.due_date,
        start_date: q.start_date,
        end_date: q.end_date,
        created_at: q.created_at,
        intern_id: q.intern_id,
        intern_name: intern?.name || 'Peserta',
        intern_department: intern?.department,
        intern_major: intern?.major,
        href: null // tidak ada halaman detail khusus — tampilkan info inline
      };
    });

    // === 4. Combine + sort by created_at ===
    const allQuests = [...groupQuests, ...individualQuests].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      quests: allQuests,
      count: allQuests.length,
      group_count: groupQuests.length,
      individual_count: individualQuests.length
    });
  } catch (e: any) {
    console.error('[active-quests] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
