// ============================================================
// /api/quests/[id]/force-cancel — Batalkan semua peserta yang sedang in_progress
// Digunakan pembina/admin jika quest ternyata salah total & ingin recall
//
// Effect:
//   - Semua quest_logs dengan status='in_progress' → 'cancelled'
//   - current_slots_taken di-reset ke count completed
//   - EXP tidak diberikan ke peserta yang in_progress (belum submit)
//   - Quest tetap ada, tapi tidak bisa diambil lagi (is_active=false)
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
    const reason = body?.reason?.trim();
    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'Alasan wajib diisi (minimal 5 karakter) untuk audit trail' },
        { status: 400 }
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

    // Authorization
    if (pembina && !admin) {
      if (quest.created_by_pembina_id !== pembina.pembina_id) {
        return NextResponse.json(
          { error: 'Anda hanya bisa force-cancel quest yang Anda deploy sendiri' },
          { status: 403 }
        );
      }
    }

    const actorType = admin ? 'admin' : 'pembina';
    const actorId = admin ? (admin as any).sub : pembina!.pembina_id;
    const actorName = admin ? (admin as any).name : pembina!.name;

    // Cari semua quest_logs dengan status='in_progress'
    const { data: inProgressLogs, error: lErr } = await supabase
      .from('quest_logs')
      .select('id, intern_id, intern_name')
      .eq('quest_id', questId)
      .eq('status', 'in_progress');
    if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

    if (!inProgressLogs || inProgressLogs.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada peserta yang sedang in_progress pada quest ini' },
        { status: 400 }
      );
    }

    // Update semua in_progress → cancelled
    const { error: uErr } = await supabase
      .from('quest_logs')
      .update({ status: 'cancelled' })
      .eq('quest_id', questId)
      .eq('status', 'in_progress');
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // Update current_slots_taken: hanya hitung yang completed
    const { count: completedCount } = await supabase
      .from('quest_logs')
      .select('id', { count: 'exact', head: true })
      .eq('quest_id', questId)
      .eq('status', 'completed');

    await supabase
      .from('activities')
      .update({
        current_slots_taken: completedCount || 0,
        is_active: false,  // Nonaktifkan quest supaya tidak bisa diambil lagi
        cancellation_reason: reason
      })
      .eq('id', questId);

    // Insert audit log per intern yang dibatalkan
    const auditInserts = inProgressLogs.map((log: any) => ({
      quest_id: questId,
      quest_title: quest.title,
      action: 'force_cancel',
      actor_type: actorType,
      actor_id: actorId,
      actor_name: actorName,
      affected_intern_id: log.intern_id,
      reason,
      created_at: new Date().toISOString()
    }));
    await supabase.from('quest_audit_logs').insert(auditInserts);

    // System message ke grup
    if (quest.group_id) {
      const internNames = inProgressLogs.map((l: any) => l.intern_name || 'Peserta').join(', ');
      await supabase.from('chat_messages').insert({
        group_id: quest.group_id,
        sender_type: 'system',
        sender_id: actorId,
        sender_name: 'Sistem',
        message_type: 'system',
        content: `🚫 ${actorName} membatalkan quest "${quest.title}" untuk ${inProgressLogs.length} peserta yang sedang in_progress (${internNames}). Alasan: ${reason}. Peserta yang sudah completed tetap dapat EXP.`
      });
    }

    return NextResponse.json({
      success: true,
      cancelled_count: inProgressLogs.length,
      message: `${inProgressLogs.length} peserta dibatalkan dari quest ini`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
