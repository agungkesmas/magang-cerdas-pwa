// ============================================================
// /api/quests/[id]/abandon — Peserta batalkan quest sendiri
//
// Use case:
//   - Peserta sudah START quest tapi ternyata tidak bisa menyelesaikannya
//   - Dipakai sebelum check-out pulang (gate: tidak boleh ada in_progress quest)
//   - Tidak ada EXP yang diberikan
//
// Effect:
//   - quest_logs.status: 'in_progress' → 'cancelled'
//   - submission_notes diisi alasan pembatalan (audit trail)
//   - current_slots_taken di-decrement (jika quest punya slot limit)
//   - Peserta tetap bisa START quest lagi besok (recurring) atau setelahnya (non-recurring)
//
// Akses: Peserta (intern)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const questId = params.id;
    if (!questId) return NextResponse.json({ error: 'Quest ID wajib diisi' }, { status: 400 });

    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const reason = body?.reason?.trim();
    if (!reason || reason.length < 5) {
      return NextResponse.json(
        { error: 'Alasan pembatalan wajib diisi minimal 5 karakter (untuk audit trail).' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Fetch quest_log
    const { data: log, error: lErr } = await supabase
      .from('quest_logs')
      .select('id, status, quest_id')
      .eq('quest_id', questId)
      .eq('intern_id', intern.intern_id)
      .maybeSingle();

    if (lErr || !log) {
      return NextResponse.json({ error: 'Quest log tidak ditemukan. Anda belum mengambil quest ini.' }, { status: 404 });
    }

    if (log.status !== 'in_progress') {
      return NextResponse.json(
        { error: `Quest tidak bisa dibatalkan karena status saat ini: ${log.status}. Hanya quest yang sedang dikerjakan (in_progress) yang bisa dibatalkan.` },
        { status: 400 }
      );
    }

    // 2. Update quest_log status → cancelled
    const { error: uErr } = await supabase
      .from('quest_logs')
      .update({
        status: 'cancelled',
        submitted_at: new Date().toISOString(),
        submission_notes: `[Dibatalkan peserta] ${reason}`,
        xp_awarded: 0
      })
      .eq('id', log.id);

    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

    // 3. Decrement current_slots_taken di activities (jika ada slot limit)
    try {
      const { data: quest } = await supabase
        .from('activities')
        .select('current_slots_taken, max_participants')
        .eq('id', questId)
        .maybeSingle();
      if (quest && quest.current_slots_taken > 0) {
        await supabase
          .from('activities')
          .update({ current_slots_taken: quest.current_slots_taken - 1 })
          .eq('id', questId);
      }
    } catch {
      // non-critical, biarkan
    }

    return NextResponse.json({
      success: true,
      message: 'Quest berhasil dibatalkan. Tidak ada EXP yang diberikan. Anda bisa mengambil quest lain atau mengulang besok.'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
