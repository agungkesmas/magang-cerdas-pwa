// ============================================================
// /api/quests/bonus-xp — Pembina kasih Bonus XP ke peserta yang sudah submit quest
//
// Aturan (standar industri):
// - Hanya pembina yang BISA kasih bonus (admin tidak, untuk menjaga role separation)
// - Quest_log harus status='completed' (peserta sudah submit)
// - Pembina harus anggota grup tempat quest di-deploy
// - 1 bonus per quest_log (UNIQUE constraint di xp_bonus_logs) — anti double-award
// - Bonus XP min 1, max 100 (anti abuse)
// - Setelah berhasil:
//   1. Update interns.total_exp += bonus_xp
//   2. Insert chat_messages (system) ke grup — pesan motivasi
//   3. Insert nudges ke peserta — notifikasi di Home
//   4. Insert xp_bonus_logs — audit trail
//
// Response:
//   { success: true, bonus_xp, new_total_exp, message }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

const MAX_BONUS = 100;
const MIN_BONUS = 1;

export async function POST(req: NextRequest) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) {
      return NextResponse.json({ error: 'Unauthorized — hanya pembina yang bisa kasih bonus XP' }, { status: 401 });
    }

    const { quest_log_id, bonus_xp, note } = await req.json();

    // === Validasi input ===
    if (!quest_log_id) {
      return NextResponse.json({ error: 'quest_log_id wajib diisi' }, { status: 400 });
    }

    const bonusXp = parseInt(bonus_xp, 10);
    if (isNaN(bonusXp) || bonusXp < MIN_BONUS || bonusXp > MAX_BONUS) {
      return NextResponse.json(
        { error: `Bonus XP harus antara ${MIN_BONUS} dan ${MAX_BONUS}` },
        { status: 400 }
      );
    }

    const trimmedNote = note?.trim() || null;

    const supabase = createServerClient();

    // === 1. Fetch quest_log + quest info + group ===
    // Untuk recurring: kita cari LATEST quest_daily_completion (1 bonus per-hari)
    // Untuk non-recurring: pakai quest_log_id seperti biasa
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
        activities!inner(id, title, is_quest, is_active, is_recurring),
        interns!inner(id, name, total_exp)
      `)
      .eq('id', quest_log_id)
      .maybeSingle();

    if (qlErr || !questLogRaw) {
      return NextResponse.json({ error: 'Quest log tidak ditemukan' }, { status: 404 });
    }

    // Cast: supabase-ts sering salah infer relasi sebagai array
    const questLog = questLogRaw as any;
    const questActivity = Array.isArray(questLog.activities) ? questLog.activities[0] : questLog.activities;
    const internRow = Array.isArray(questLog.interns) ? questLog.interns[0] : questLog.interns;

    // === 2. Validasi status ===
    // Untuk non-recurring: quest_log.status harus 'completed'
    // Untuk recurring: cari latest quest_daily_completion (tidak peduli status quest_log)
    let dailyCompletionId: string | null = null;
    let dailyCompletionDate: string | null = null;

    if (questActivity?.is_recurring) {
      // Cari LATEST daily completion untuk peserta ini
      const { data: latestDaily } = await supabase
        .from('quest_daily_completions')
        .select('id, completion_date, xp_awarded')
        .eq('quest_id', questLog.quest_id)
        .eq('intern_id', questLog.intern_id)
        .order('completion_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latestDaily) {
        return NextResponse.json(
          { error: 'Peserta belum pernah submit quest recurring ini. Bonus XP hanya untuk yang sudah complete minimal 1 hari.' },
          { status: 400 }
        );
      }
      dailyCompletionId = latestDaily.id;
      dailyCompletionDate = latestDaily.completion_date;

      // Cek apakah daily completion ini sudah dapat bonus
      const { data: existingDailyBonus } = await supabase
        .from('quest_daily_bonus_logs')
        .select('id, bonus_xp')
        .eq('quest_daily_completion_id', dailyCompletionId)
        .maybeSingle();
      if (existingDailyBonus) {
        return NextResponse.json(
          { error: `Completion tanggal ${dailyCompletionDate} sudah dapat bonus XP sebesar ${existingDailyBonus.bonus_xp}. Tidak bisa ditambah lagi (anti double-award).` },
          { status: 409 }
        );
      }
    } else {
      // Non-recurring: cek status quest_log
      if (questLog.status !== 'completed') {
        return NextResponse.json(
          { error: 'Peserta belum submit quest ini. Bonus XP hanya untuk quest yang sudah selesai.' },
          { status: 400 }
        );
      }
    }
    // Untuk non-recurring: cek UNIQUE constraint di xp_bonus_logs.quest_log_id (anti double-award)
    // Untuk recurring: cek UNIQUE constraint di quest_daily_bonus_logs.quest_daily_completion_id (anti double-award per-hari)

    // === 4. Validasi: pembina harus anggota grup tempat quest di-deploy ===
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

    // === 5. Cek apakah sudah pernah kasih bonus (UNIQUE constraint) ===
    // Untuk recurring: sudah dicek di step 2 (quest_daily_bonus_logs)
    // Untuk non-recurring: cek di xp_bonus_logs
    if (!questActivity?.is_recurring) {
      const { data: existingBonus } = await supabase
        .from('xp_bonus_logs')
        .select('id, bonus_xp')
        .eq('quest_log_id', quest_log_id)
        .maybeSingle();

      if (existingBonus) {
        return NextResponse.json(
          { error: `Bonus XP sudah pernah diberikan (+${existingBonus.bonus_xp} XP). Tidak bisa kasih bonus kedua kali.` },
          { status: 409 }
        );
      }
    }

    // === 6. Insert audit log ===
    if (questActivity?.is_recurring && dailyCompletionId) {
      // Recurring: insert ke quest_daily_bonus_logs
      const { error: logErr } = await supabase
        .from('quest_daily_bonus_logs')
        .insert({
          quest_daily_completion_id: dailyCompletionId,
          quest_id: questLog.quest_id,
          intern_id: questLog.intern_id,
          pembina_id: pembina.pembina_id,
          group_id: questLog.group_id,
          completion_date: dailyCompletionDate,
          bonus_xp: bonusXp,
          note: trimmedNote
        });

      if (logErr) {
        if (logErr.code === '23505') {
          return NextResponse.json(
            { error: `Completion tanggal ${dailyCompletionDate} sudah dapat bonus XP. Tidak bisa ditambah lagi.` },
            { status: 409 }
          );
        }
        console.error('[quests/bonus-xp] insert daily log error:', logErr);
        return NextResponse.json({ error: `Gagal mencatat bonus: ${logErr.message}` }, { status: 500 });
      }
    } else {
      // Non-recurring: insert ke xp_bonus_logs
      const { error: logErr } = await supabase
        .from('xp_bonus_logs')
        .insert({
          quest_log_id,
          intern_id: questLog.intern_id,
          pembina_id: pembina.pembina_id,
          group_id: questLog.group_id,
          quest_id: questLog.quest_id,
          bonus_xp: bonusXp,
          note: trimmedNote
        });

      if (logErr) {
        // Handle UNIQUE violation (race condition)
        if (logErr.code === '23505') {
          return NextResponse.json(
            { error: 'Bonus XP sudah pernah diberikan untuk quest ini.' },
            { status: 409 }
          );
        }
        console.error('[quests/bonus-xp] insert log error:', logErr);
        return NextResponse.json({ error: `Gagal mencatat bonus: ${logErr.message}` }, { status: 500 });
      }
    }

    // === 7. Update interns.total_exp ===
    const currentExp = internRow?.total_exp || 0;
    const newTotalExp = currentExp + bonusXp;
    const { error: updateErr } = await supabase
      .from('interns')
      .update({ total_exp: newTotalExp })
      .eq('id', questLog.intern_id);

    if (updateErr) {
      console.error('[quests/bonus-xp] update intern exp error:', updateErr);
      // Rollback: hapus log yang baru saja di-insert
      if (questActivity?.is_recurring && dailyCompletionId) {
        await supabase.from('quest_daily_bonus_logs').delete().eq('quest_daily_completion_id', dailyCompletionId);
      } else {
        await supabase.from('xp_bonus_logs').delete().eq('quest_log_id', quest_log_id);
      }
      return NextResponse.json({ error: 'Gagal update XP peserta' }, { status: 500 });
    }

    // === 8. Insert system message ke chat grup (motivasi publik) ===
    const internName = internRow?.name || 'Peserta';
    const questTitle = questActivity?.title || 'Quest';
    const recurringSuffix = questActivity?.is_recurring && dailyCompletionDate
      ? ` (Harian: ${dailyCompletionDate})`
      : '';
    const noteText = trimmedNote ? `\n\n"${trimmedNote}"` : '';
    const chatMessage = `🎁 BONUS XP!

Pembina ${pembina.name} memberikan +${bonusXp} XP bonus ke ${internName} untuk quest "${questTitle}"${recurringSuffix}.${noteText}

Total XP ${internName} sekarang: ${newTotalExp} XP`;

    await supabase.from('chat_messages').insert({
      group_id: questLog.group_id,
      sender_type: 'system',
      sender_id: pembina.pembina_id,
      sender_name: 'Sistem',
      message_type: 'system',
      content: chatMessage
    });

    // === 9. Insert nudge ke peserta (notifikasi di Home) ===
    await supabase.from('nudges').insert({
      intern_id: questLog.intern_id,
      message: `🎉 Anda mendapat +${bonusXp} XP bonus dari ${pembina.name} untuk quest "${questTitle}"${recurringSuffix}!${trimmedNote ? ` Catatan: "${trimmedNote}"` : ''}`,
      type: 'bonus_xp'
    });

    return NextResponse.json({
      success: true,
      bonus_xp: bonusXp,
      new_total_exp: newTotalExp,
      message: `+${bonusXp} XP bonus diberikan ke ${internName}`
    });
  } catch (e: any) {
    console.error('[quests/bonus-xp] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
