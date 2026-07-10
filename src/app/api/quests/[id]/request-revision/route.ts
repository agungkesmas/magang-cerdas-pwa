// ============================================================
// /api/quests/[id]/request-revision — Pembina/Admin minta revisi quest
//
// Use case:
//   - Peserta submit quest, kualitas kurang bagus tapi masih bisa diperbaiki
//   - Pembina/admin minta peserta kerjakan ulang & submit ulang
//   - EXP di-debit sementara, quest balik ke in_progress
//   - Saat peserta submit ulang, EXP diberikan lagi (via submit API)
//
// Effect:
//   1. Update quest_logs.status = 'in_progress'
//   2. Debit EXP dari intern (akan dikembalikan saat submit ulang)
//   3. submission_notes → catatan revisi (audit trail)
//   4. Insert chat system message ke grup
//   5. Insert nudge ke peserta dengan alasan revisi
//
// Untuk recurring quest:
//   - Hapus latest quest_daily_completion (entry hari ini)
//   - Reset quest_log.status ke 'in_progress' (peserta submit ulang hari ini)
//   - Debit EXP dari daily completion
//
// PENTING: revisi TIDAK kena jeda 2 jam (karena revisi task yang sama)
//
// Akses: Pembina (member grup) atau Admin
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken, getAdminToken } from '@/lib/auth';

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const pembina = await getPembinaToken();
    const admin = await getAdminToken();
    if (!pembina && !admin) {
      return NextResponse.json({ error: 'Unauthorized — pembina atau admin only' }, { status: 401 });
    }
    const reviewerId = pembina?.pembina_id || admin?.sub || '';
    const reviewerName = pembina?.name || admin?.name || 'Admin';

    const questLogId = params.id;
    if (!questLogId) {
      return NextResponse.json({ error: 'Quest log ID wajib diisi' }, { status: 400 });
    }

    const body = await req.json();
    const reason = body?.reason?.trim();
    if (!reason || reason.length < 10) {
      return NextResponse.json(
        { error: 'Alasan revisi wajib diisi minimal 10 karakter (untuk feedback ke peserta).' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Fetch quest_log + quest + group
    const { data: questLogRaw, error: qlErr } = await supabase
      .from('quest_logs')
      .select(`
        id,
        quest_id,
        intern_id,
        group_id,
        status,
        xp_awarded,
        submitted_at,
        submission_notes,
        activities!inner(id, title, is_quest, is_active, is_recurring, xp_reward),
        interns!inner(id, name, total_exp)
      `)
      .eq('id', questLogId)
      .maybeSingle();

    if (qlErr || !questLogRaw) {
      return NextResponse.json({ error: 'Quest log tidak ditemukan' }, { status: 404 });
    }

    const questLog = questLogRaw as any;
    const questActivity = Array.isArray(questLog.activities) ? questLog.activities[0] : questLog.activities;
    const internRow = Array.isArray(questLog.interns) ? questLog.interns[0] : questLog.interns;

    // 2. Validasi status — harus sudah submit
    if (!questLog.submitted_at) {
      return NextResponse.json(
        { error: 'Peserta belum submit quest ini. Tidak bisa minta revisi.' },
        { status: 400 }
      );
    }

    // 3. Validasi akses
    if (pembina && !admin) {
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', questLog.group_id)
        .eq('user_type', 'pembina')
        .eq('user_id', pembina.pembina_id)
        .maybeSingle();
      if (!membership) {
        return NextResponse.json(
          { error: 'Anda bukan anggota grup tempat quest ini di-deploy' },
          { status: 403 }
        );
      }
    }

    const xpToDebit = questLog.xp_awarded || questActivity?.xp_reward || 20;

    // 4. Handle recurring vs non-recurring
    if (questActivity?.is_recurring) {
      // RECURRING: hapus latest daily completion
      const { data: latestDaily } = await supabase
        .from('quest_daily_completions')
        .select('id, completion_date, xp_awarded')
        .eq('quest_id', questLog.quest_id)
        .eq('intern_id', questLog.intern_id)
        .order('completion_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestDaily) {
        await supabase
          .from('quest_daily_completions')
          .delete()
          .eq('id', latestDaily.id);
      }

      // Reset quest_log ke 'in_progress' (peserta submit ulang)
      // submitted_at tetap ada untuk audit trail jeda 2 jam
      await supabase
        .from('quest_logs')
        .update({
          status: 'in_progress',
          submission_notes: `[REVISI diminta oleh ${reviewerName}] ${reason}\n\nKeterangan asli: ${questLog.submission_notes || '-'}`,
          xp_awarded: 0
          // submitted_at TIDAK di-reset — supaya jeda 2 jam tetap menghitung dari submit pertama
          // started_at TIDAK di-reset — supaya tidak kena jeda paralel
        })
        .eq('id', questLogId);
    } else {
      // NON-RECURRING: balik ke 'in_progress'
      await supabase
        .from('quest_logs')
        .update({
          status: 'in_progress',
          submission_notes: `[REVISI diminta oleh ${reviewerName}] ${reason}\n\nKeterangan asli: ${questLog.submission_notes || '-'}`,
          xp_awarded: 0
          // submitted_at & started_at tetap — supaya tidak kena jeda 2 jam saat submit ulang
        })
        .eq('id', questLogId);

      // Hapus dari activity_completions (kalau ada)
      await supabase
        .from('activity_completions')
        .delete()
        .eq('activity_id', questLog.quest_id)
        .eq('intern_id', questLog.intern_id);
    }

    // 5. Debit EXP dari intern
    if (xpToDebit > 0) {
      const currentExp = internRow?.total_exp || 0;
      const newExp = Math.max(0, currentExp - xpToDebit);
      await supabase
        .from('interns')
        .update({ total_exp: newExp })
        .eq('id', questLog.intern_id);
    }

    // 6. Insert system message ke chat grup
    const internName = internRow?.name || 'Peserta';
    const questTitle = questActivity?.title || 'Quest';
    const chatMessage = `📝 REVISI QUEST DIMINTA

${reviewerName} meminta revisi submission quest "${questTitle}" dari ${internName}.
Alasan: ${reason}
-${xpToDebit} EXP di-hold sementara (akan dikembalikan setelah submit ulang).

${internName}, silakan kerjakan ulang & submit ulang quest ini.`;

    await supabase.from('chat_messages').insert({
      group_id: questLog.group_id,
      sender_type: 'system',
      sender_id: reviewerId,
      sender_name: 'Sistem',
      message_type: 'system',
      content: chatMessage
    });

    // 7. Insert nudge ke peserta
    await supabase.from('nudges').insert({
      intern_id: questLog.intern_id,
      message: `📝 REVISI QUEST "${questTitle}" — ${reviewerName} meminta Anda kerjakan ulang. Alasan: ${reason}. -${xpToDebit} EXP di-hold sementara, akan dikembalikan setelah submit ulang.`,
      type: 'quest_revision',
      created_by_type: pembina ? 'pembina' : 'admin',
      created_by_id: reviewerId,
      created_by_name: reviewerName
    });

    return NextResponse.json({
      success: true,
      message: `Revisi diminta untuk quest "${questTitle}". -${xpToDebit} EXP di-hold dari ${internName}.`,
      xp_held: xpToDebit
    });
  } catch (e: any) {
    console.error('[quests/request-revision] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
