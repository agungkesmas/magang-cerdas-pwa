// ============================================================
// /api/quests/start — Peserta klik START di Quest Card
// Insert ke quest_logs: status=in_progress
// Update activities.current_slots_taken (+1)
// Anti-double: UNIQUE(quest_id, intern_id)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { quest_id, group_id } = await req.json();
    if (!quest_id) return NextResponse.json({ error: 'quest_id wajib diisi' }, { status: 400 });
    if (!group_id) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // 1. Fetch quest
    const { data: quest, error: qErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', quest_id)
      .eq('is_quest', true)
      .single();
    if (qErr || !quest) return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
    if (!quest.is_active) return NextResponse.json({ error: 'Quest sudah tidak aktif' }, { status: 400 });
    if (quest.due_date && new Date(quest.due_date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Quest sudah lewat deadline' }, { status: 400 });
    }

    // 2. Verify intern adalah member grup
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', group_id)
      .eq('user_type', 'peserta')
      .eq('user_id', intern.intern_id)
      .maybeSingle();
    if (!membership) return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 });

    // 3. Cek apakah sudah pernah start
    const { data: existing } = await supabase
      .from('quest_logs')
      .select('id, status')
      .eq('quest_id', quest_id)
      .eq('intern_id', intern.intern_id)
      .maybeSingle();
    if (existing) {
      if (existing.status === 'in_progress') {
        return NextResponse.json({ error: 'Anda sudah start quest ini' }, { status: 409 });
      }
      if (existing.status === 'completed') {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan quest ini' }, { status: 409 });
      }
      // Kalau status 'cancelled' atau 'available', allow re-start
      await supabase
        .from('quest_logs')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // 4. Cek max_slots
      if (quest.max_slots) {
        const { count } = await supabase
          .from('quest_logs')
          .select('id', { count: 'exact', head: true })
          .eq('quest_id', quest_id)
          .in('status', ['in_progress', 'completed']);
        if ((count || 0) >= quest.max_slots) {
          return NextResponse.json({ error: 'Slot quest sudah penuh' }, { status: 400 });
        }
      }

      // 5. Insert quest_log
      const { error: lErr } = await supabase.from('quest_logs').insert({
        quest_id,
        intern_id: intern.intern_id,
        group_id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      });
      if (lErr) {
        if (lErr.code === '23505') {
          return NextResponse.json({ error: 'Anda sudah pernah ambil quest ini' }, { status: 409 });
        }
        return NextResponse.json({ error: lErr.message }, { status: 500 });
      }

      // 6. Update current_slots_taken
      await supabase
        .from('activities')
        .update({ current_slots_taken: (quest.current_slots_taken || 0) + 1 })
        .eq('id', quest_id);
    }

    // 7. Insert system message di chat
    await supabase.from('chat_messages').insert({
      group_id,
      sender_type: 'system',
      sender_id: intern.intern_id,
      sender_name: 'Sistem',
      message_type: 'system',
      content: `🔵 ${intern.name} memulai quest "${quest.title}"`
    });

    return NextResponse.json({ success: true, status: 'in_progress' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
