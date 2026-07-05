// ============================================================
// /api/quests/create — Deploy quest ke grup (Pembina ATAU Admin)
// Insert ke activities (is_quest=true) + chat_messages (quest_card)
// Support: single quest ATAU recurring (gaya hotel - range tanggal)
//
// Akses:
//   - Pembina: harus anggota grup target
//   - Admin: bebas deploy ke grup mana saja (broadcast capability)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken, getAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const pembina = await getPembinaToken();
    const admin = await getAdminToken();
    if (!pembina && !admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      title, description, group_id, xp_reward, deadline, max_slots,
      // Recurring fields (gaya hotel)
      is_recurring = false, start_date, end_date, skip_weekend = true, daily_deadline_hour = 17
    } = await req.json();

    if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });
    if (!group_id) return NextResponse.json({ error: 'Grup tujuan wajib diisi' }, { status: 400 });

    // Determine sender info (pembina atau admin)
    let senderType: string;
    let senderId: string;
    let senderName: string;
    let senderPembinaId: string | null = null;
    if (admin) {
      senderType = 'admin';
      senderId = admin.sub;
      senderName = admin.name;
    } else {
      senderType = 'pembina';
      senderId = pembina!.pembina_id;
      senderName = pembina!.name;
      senderPembinaId = pembina!.pembina_id;
    }

    const supabase = createServerClient();

    // Verify membership — admin bebas, pembina harus member
    if (!admin) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', group_id)
        .eq('user_type', 'pembina')
        .eq('user_id', pembina!.pembina_id)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: 'Anda bukan member grup ini' }, { status: 403 });
      }
    }

    // Parse deadline
    let deadlineISO: string | null = null;
    if (deadline) {
      const d = new Date(deadline);
      if (isNaN(d.getTime())) return NextResponse.json({ error: 'Format deadline tidak valid' }, { status: 400 });
      deadlineISO = d.toISOString();
    }

    // Validate XP
    const xp = parseInt(xp_reward, 10) || 20;
    if (xp < 1 || xp > 100) return NextResponse.json({ error: 'XP harus antara 1-100' }, { status: 400 });

    // Parse recurring fields
    let parsedStartDate: string | null = null;
    let parsedEndDate: string | null = null;
    if (is_recurring) {
      if (!start_date || !end_date) {
        return NextResponse.json({ error: 'Mode recurring wajib set start_date & end_date' }, { status: 400 });
      }
      const sd = new Date(start_date);
      const ed = new Date(end_date);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        return NextResponse.json({ error: 'Format tanggal range tidak valid' }, { status: 400 });
      }
      if (ed < sd) {
        return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });
      }
      parsedStartDate = sd.toISOString().split('T')[0];
      parsedEndDate = ed.toISOString().split('T')[0];
    }

    const deadlineHour = Number(daily_deadline_hour);
    if (isNaN(deadlineHour) || deadlineHour < 0 || deadlineHour > 23) {
      return NextResponse.json({ error: 'Daily deadline hour tidak valid (0-23)' }, { status: 400 });
    }

    // Insert activity (is_quest=true)
    const { data: activity, error: aErr } = await supabase
      .from('activities')
      .insert({
        title: title.trim(),
        description: description.trim(),
        intern_id: null,
        department: null,
        due_date: deadlineISO,
        is_active: true,
        completed_by_intern_id: null,
        completed_at: null,
        completion_notes: null,
        created_by: admin ? admin.sub : null, // admin id kalau admin, null kalau pembina
        created_by_intern: false,
        is_archived: false,
        // Recurring fields (gaya hotel)
        is_recurring: !!is_recurring,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        skip_weekend: !!skip_weekend,
        daily_deadline_hour: deadlineHour,
        // Quest fields
        is_quest: true,
        group_id,
        created_by_pembina_id: senderPembinaId, // null kalau admin deploy
        xp_reward: xp,
        max_slots: max_slots ? parseInt(max_slots, 10) : null,
        current_slots_taken: 0
      })
      .select()
      .single();
    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    // Insert chat_message (type=quest_card)
    const { data: chatMsg, error: cErr } = await supabase
      .from('chat_messages')
      .insert({
        group_id,
        sender_type: senderType,
        sender_id: senderId,
        sender_name: senderName,
        message_type: 'quest_card',
        content: `🎯 Quest baru: ${title.trim()}`,
        quest_id: activity.id
      })
      .select()
      .single();
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    // Insert system message
    const recurringInfo = is_recurring ? ` (🔁 Harian ${parsedStartDate} → ${parsedEndDate})` : '';
    const roleLabel = admin ? 'Admin' : 'Pembina';
    await supabase.from('chat_messages').insert({
      group_id,
      sender_type: 'system',
      sender_id: senderId,
      sender_name: 'Sistem',
      message_type: 'system',
      content: `✨ ${roleLabel} ${senderName} mendeploy quest baru: "${title.trim()}" (+${xp} XP)${recurringInfo}`
    });

    return NextResponse.json({ success: true, quest: activity, chat_message: chatMsg });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
