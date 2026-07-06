// ============================================================
// /api/activities/[id]/bonus-xp — Pembina kasih Bonus XP ke aktivitas peserta
//
// Aturan (paralel dengan /api/quests/bonus-xp):
// - Hanya pembina yang BISA kasih bonus (admin tidak, untuk menjaga role separation)
// - Aktivitas yang BISA dikasih bonus:
//   * Aktivitas self-added (created_by_intern=true) — peserta tambah sendiri
//   * Aktivitas departemen/individual (created_by_intern=false) — deploy oleh admin/pembina
//   Syarat: BUKAN quest (is_quest=false) DAN BUKAN recurring (is_recurring=false)
//   (Quest pakai sistem bonus terpisah; Recurring pakai sistem bonus +50 EXP all-complete)
// - Aktivitas harus sudah completed (ada row di activity_completions)
// - 1 bonus per activity_completion (UNIQUE constraint di activity_bonus_logs) — anti double-award
// - Bonus XP min 1, max 100 (anti abuse)
// - Pembina harus dari departemen yang sama dengan peserta (atau Lintas Bidang)
// - Setelah berhasil:
//   1. Update interns.total_exp += bonus_xp
//   2. Update activity_completions.bonus_xp/bonus_note/bonus_by_pembina_id/bonus_at
//   3. Insert activity_bonus_logs — audit trail
//   4. Insert nudges ke peserta — notifikasi di Home
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';

const MAX_BONUS = 100;
const MIN_BONUS = 1;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) {
      return NextResponse.json(
        { error: 'Unauthorized — hanya pembina yang bisa kasih bonus XP' },
        { status: 401 }
      );
    }

    const activityId = params.id;
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID wajib diisi' }, { status: 400 });
    }

    const { bonus_xp, note } = await req.json();

    // === Validasi input ===
    const bonusXp = parseInt(bonus_xp, 10);
    if (isNaN(bonusXp) || bonusXp < MIN_BONUS || bonusXp > MAX_BONUS) {
      return NextResponse.json(
        { error: `Bonus XP harus antara ${MIN_BONUS} dan ${MAX_BONUS}` },
        { status: 400 }
      );
    }

    const trimmedNote = note?.trim() || null;

    const supabase = createServerClient();

    // === 1. Fetch activity + completion ===
    const { data: activity, error: aErr } = await supabase
      .from('activities')
      .select('id, title, intern_id, created_by_intern, is_quest, is_active, is_recurring, department')
      .eq('id', activityId)
      .maybeSingle();

    if (aErr || !activity) {
      return NextResponse.json({ error: 'Aktivitas tidak ditemukan' }, { status: 404 });
    }

    // === 2. Validasi: BUKAN quest ===
    if (activity.is_quest) {
      return NextResponse.json(
        { error: 'Quest menggunakan sistem bonus terpisah. Gunakan tombol Bonus XP di Quest Card di Chat Grup.' },
        { status: 400 }
      );
    }

    // === 3. Validasi: BUKAN recurring (sudah punya sistem bonus +50 EXP all-complete) ===
    if (activity.is_recurring) {
      return NextResponse.json(
        { error: 'Aktivitas Harian Berulang tidak bisa dikasih Bonus XP individual. Sistem sudah punya bonus +50 EXP otomatis kalau peserta selesai SEMUA hari kerja di rentang.' },
        { status: 400 }
      );
    }

    // === 4. Fetch activity_completion ===
    const { data: completion, error: cErr } = await supabase
      .from('activity_completions')
      .select('id, intern_id, completed_at, bonus_xp, completion_notes')
      .eq('activity_id', activityId)
      .maybeSingle();

    if (cErr || !completion) {
      return NextResponse.json(
        { error: 'Peserta belum menyelesaikan aktivitas ini. Bonus XP hanya untuk aktivitas yang sudah completed.' },
        { status: 400 }
      );
    }

    // === 5. Cek apakah sudah pernah dapat bonus ===
    if (completion.bonus_xp && completion.bonus_xp > 0) {
      return NextResponse.json(
        { error: `Aktivitas ini sudah dapat bonus XP sebesar ${completion.bonus_xp} dari pembina lain. Tidak bisa ditambah lagi (anti double-award).` },
        { status: 409 }
      );
    }

    // === 6. Fetch intern ===
    const { data: intern, error: iErr } = await supabase
      .from('interns')
      .select('id, name, department, total_exp')
      .eq('id', completion.intern_id)
      .maybeSingle();

    if (iErr || !intern) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    // === 7. Validasi: pembina harus dari departemen sama dengan peserta, ATAU pembina Lintas Bidang ===
    if (pembina.department !== intern.department && pembina.department !== 'Lintas Bidang') {
      return NextResponse.json(
        { error: `Anda hanya bisa kasih bonus ke peserta departemen Anda (${pembina.department}). Peserta ini dari departemen ${intern.department}.` },
        { status: 403 }
      );
    }

    // === 8. Cek UNIQUE constraint (race-condition safety) ===
    const { data: existingBonus } = await supabase
      .from('activity_bonus_logs')
      .select('id, bonus_xp')
      .eq('activity_completion_id', completion.id)
      .maybeSingle();

    if (existingBonus) {
      return NextResponse.json(
        { error: `Aktivitas ini sudah dapat bonus XP sebesar ${existingBonus.bonus_xp}. Tidak bisa ditambah lagi.` },
        { status: 409 }
      );
    }

    // === 9. Insert activity_bonus_logs ===
    const { error: logErr } = await supabase.from('activity_bonus_logs').insert({
      activity_completion_id: completion.id,
      activity_id: activityId,
      intern_id: intern.id,
      pembina_id: pembina.pembina_id,
      bonus_xp: bonusXp,
      note: trimmedNote,
      created_at: new Date().toISOString()
    });

    if (logErr) {
      if (logErr.code === '23505') {
        return NextResponse.json(
          { error: 'Aktivitas ini sudah dapat bonus XP (race condition). Reload halaman.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: logErr.message }, { status: 500 });
    }

    // === 10. Update activity_completions (untuk display cepat) ===
    await supabase
      .from('activity_completions')
      .update({
        bonus_xp: bonusXp,
        bonus_note: trimmedNote,
        bonus_by_pembina_id: pembina.pembina_id,
        bonus_at: new Date().toISOString()
      })
      .eq('id', completion.id);

    // === 11. Grant XP ke intern ===
    const newTotalExp = (intern.total_exp || 0) + bonusXp;
    await supabase
      .from('interns')
      .update({ total_exp: newTotalExp })
      .eq('id', intern.id);

    // === 12. Insert nudge (notifikasi ke peserta) ===
    const activityKind = activity.created_by_intern
      ? 'aktivitas yang ditambahkan sendiri'
      : (activity.department ? `aktivitas departemen ${activity.department}` : 'aktivitas yang diberikan pembina');
    await supabase.from('nudges').insert({
      intern_id: intern.id,
      sender_type: 'pembina',
      sender_id: pembina.pembina_id,
      sender_name: pembina.name,
      message: `🎁 ${pembina.name} memberi Bonus XP +${bonusXp} untuk ${activityKind} "${activity.title}"${trimmedNote ? ` — "${trimmedNote}"` : ''}`,
      type: 'bonus_xp',
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      bonus_xp: bonusXp,
      new_total_exp: newTotalExp,
      message: `Bonus XP +${bonusXp} berhasil diberikan ke ${intern.name}`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
