// ============================================================
// /api/quests/[id]/restore — Restore quest yang sudah di-archive
// Quest muncul kembali di chat & bisa diambil peserta (jika belum lewat deadline)
//
// Akses: Admin ONLY (pembina tidak bisa restore)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questId = params.id;
    if (!questId) return NextResponse.json({ error: 'Quest ID wajib diisi' }, { status: 400 });

    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json(
        { error: 'Hanya admin yang bisa restore quest yang diarsipkan' },
        { status: 403 }
      );
    }

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

    if (!quest.is_archived) {
      return NextResponse.json({ error: 'Quest belum diarsipkan' }, { status: 400 });
    }

    // Cek apakah deadline sudah lewat — kalau lewat, restore tapi tetap nonaktif
    const isOverdue = quest.due_date ? new Date(quest.due_date).getTime() < Date.now() : false;
    const newIsActive = !isOverdue; // Kalau deadline lewat, tetap nonaktif

    const { error: uErr } = await supabase
      .from('activities')
      .update({
        is_archived: false,
        is_active: newIsActive,
        archived_at: null,
        archived_by_type: null,
        archived_by_id: null
      })
      .eq('id', questId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Audit log
    await supabase.from('quest_audit_logs').insert({
      quest_id: questId,
      quest_title: quest.title,
      action: 'restore',
      actor_type: 'admin',
      actor_id: (admin as any).sub,
      actor_name: (admin as any).name,
      created_at: new Date().toISOString()
    });

    // System message ke grup
    if (quest.group_id) {
      const msg = isOverdue
        ? `♻️ Admin me-restore quest "${quest.title}" (tetap nonaktif karena deadline sudah lewat)`
        : `♻️ Admin me-restore quest "${quest.title}" — kembali aktif & bisa diambil peserta`;
      await supabase.from('chat_messages').insert({
        group_id: quest.group_id,
        sender_type: 'system',
        sender_id: (admin as any).sub,
        sender_name: 'Sistem',
        message_type: 'system',
        content: msg
      });
    }

    return NextResponse.json({ success: true, is_active: newIsActive, is_overdue: isOverdue });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
