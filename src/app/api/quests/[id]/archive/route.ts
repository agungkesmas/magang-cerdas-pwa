// ============================================================
// /api/quests/[id]/archive — Soft archive quest
// Quest disembunyikan dari chat baru, tapi:
//   - Peserta yang sudah ambil tetap lihat history
//   - EXP tetap aman (tidak di-revoke)
//   - Bisa di-restore kembali (admin only)
//
// Akses: Pembina (creator) atau Admin
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questId = params.id;
    if (!questId) return NextResponse.json({ error: 'Quest ID wajib diisi' }, { status: 400 });

    const [pembina, admin] = await Promise.all([getPembinaToken(), getAdminToken()]);
    if (!pembina && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim() || null;

    const supabase = createServerClient();

    // Fetch quest
    const { data: quest, error: qErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', questId)
      .eq('is_quest', true)
      .single();
    if (qErr || !quest) {
      return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
    }

    // Authorization: pembina hanya bisa archive quest miliknya; admin bebas
    if (pembina && !admin) {
      if (quest.created_by_pembina_id !== pembina.pembina_id) {
        return NextResponse.json(
          { error: 'Anda hanya bisa arsipkan quest yang Anda deploy sendiri' },
          { status: 403 }
        );
      }
    }

    if (quest.is_archived) {
      return NextResponse.json({ error: 'Quest sudah diarsipkan' }, { status: 400 });
    }

    const actorType = admin ? 'admin' : 'pembina';
    const actorId = admin ? (admin as any).sub : pembina!.pembina_id;
    const actorName = admin ? (admin as any).name : pembina!.name;

    // Update: set archived
    const { error: uErr } = await supabase
      .from('activities')
      .update({
        is_archived: true,
        is_active: false,
        archived_at: new Date().toISOString(),
        archived_by_type: actorType,
        archived_by_id: actorId
      })
      .eq('id', questId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Audit log
    await supabase.from('quest_audit_logs').insert({
      quest_id: questId,
      quest_title: quest.title,
      action: 'archive',
      actor_type: actorType,
      actor_id: actorId,
      actor_name: actorName,
      reason,
      created_at: new Date().toISOString()
    });

    // System message ke grup
    if (quest.group_id) {
      await supabase.from('chat_messages').insert({
        group_id: quest.group_id,
        sender_type: 'system',
        sender_id: actorId,
        sender_name: 'Sistem',
        message_type: 'system',
        content: `📦 ${actorName} mengarsipkan quest "${quest.title}"${reason ? ` — Alasan: ${reason}` : ''}. Peserta yang sudah mengambil tetap bisa melihat history mereka.`
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
