// ============================================================
// /api/quests/list — List semua quest dengan filter
//
// Query params:
//   - status: 'active' | 'archived' | 'expired' | 'all' (default: all)
//   - group_id: filter by grup
//   - mine: '1' untuk pembina (hanya quest miliknya)
//
// Akses: Admin, Pembina, atau BKK (read-only)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken, getBKKToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const [admin, pembina, bkk] = await Promise.all([
      getAdminToken(),
      getPembinaToken(),
      getBKKToken()
    ]);
    if (!admin && !pembina && !bkk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const groupId = searchParams.get('group_id');
    const mineOnly = searchParams.get('mine') === '1';

    const supabase = createServerClient();

    let query = supabase
      .from('activities')
      .select(`
        id, title, description, due_date, xp_reward, max_slots, current_slots_taken,
        is_active, is_archived, is_recurring, start_date, end_date, skip_weekend, daily_deadline_hour,
        created_at, edited_at, archived_at, archived_by_type,
        group_id, created_by_pembina_id,
        groups!inner(name, department, group_type),
        pembina_magang:created_by_pembina_id(name, pembina_id)
      `)
      .eq('is_quest', true)
      .order('created_at', { ascending: false });

    if (mineOnly && pembina) {
      query = query.eq('created_by_pembina_id', pembina.pembina_id);
    }

    if (groupId) {
      query = query.eq('group_id', groupId);
    }

    if (status === 'active') {
      query = query.eq('is_active', true).eq('is_archived', false);
    } else if (status === 'archived') {
      query = query.eq('is_archived', true);
    } else if (status === 'expired') {
      // Expired: not archived, not active, due_date in past
      query = query.eq('is_archived', false).lt('due_date', new Date().toISOString());
    }

    const { data: quests, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Enrich: hitung jumlah participants & completed per quest
    const enriched = await Promise.all((quests || []).map(async (q: any) => {
      const { count: totalParticipants } = await supabase
        .from('quest_logs')
        .select('id', { count: 'exact', head: true })
        .eq('quest_id', q.id);

      const { count: completedCount } = await supabase
        .from('quest_logs')
        .select('id', { count: 'exact', head: true })
        .eq('quest_id', q.id)
        .eq('status', 'completed');

      const isOverdue = q.due_date ? new Date(q.due_date).getTime() < Date.now() : false;
      const derivedStatus = q.is_archived
        ? 'archived'
        : !q.is_active
        ? isOverdue ? 'expired' : 'inactive'
        : isOverdue ? 'expired' : 'active';

      return {
        ...q,
        group_name: q.groups?.name,
        group_department: q.groups?.department,
        group_type: q.groups?.group_type,
        pembina_name: q.pembina_magang?.name,
        pembina_code: q.pembina_magang?.pembina_id,
        participants_count: totalParticipants || 0,
        completed_count: completedCount || 0,
        derived_status: derivedStatus,
        is_overdue: isOverdue
      };
    }));

    return NextResponse.json({ success: true, quests: enriched, count: enriched.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
