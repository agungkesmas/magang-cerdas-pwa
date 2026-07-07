// ============================================================
// /api/quests/submit — Peserta klik SUBMIT di Quest Card
// Update quest_logs: status=completed
// Grant XP otomatis ke intern
// Insert chat system message
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { quest_id, group_id, submission_notes } = await req.json();
    if (!quest_id) return NextResponse.json({ error: 'quest_id wajib diisi' }, { status: 400 });
    if (!group_id) return NextResponse.json({ error: 'group_id wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // 0. CEK: Peserta sudah check-in hari ini?
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayCheckIn } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', todayStart.toISOString())
      .maybeSingle();
    if (!todayCheckIn) {
      return NextResponse.json(
        { error: 'Anda belum check-in hari ini. Lakukan check-in terlebih dahulu sebelum submit quest.' },
        { status: 403 }
      );
    }

    // 1. Fetch quest
    const { data: quest, error: qErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', quest_id)
      .eq('is_quest', true)
      .single();
    if (qErr || !quest) return NextResponse.json({ error: 'Quest tidak ditemukan' }, { status: 404 });
    if (!quest.is_active) return NextResponse.json({ error: 'Quest sudah tidak aktif' }, { status: 400 });

    // 2. Cek deadline
    if (quest.due_date && new Date(quest.due_date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Quest sudah lewat deadline' }, { status: 400 });
    }

    // 3. Cek quest_log
    const { data: log } = await supabase
      .from('quest_logs')
      .select('id, status')
      .eq('quest_id', quest_id)
      .eq('intern_id', intern.intern_id)
      .maybeSingle();
    if (!log) {
      return NextResponse.json({ error: 'Anda belum start quest ini. Klik START dulu.' }, { status: 400 });
    }
    // Untuk non-recurring: status 'completed' = permanen
    // Untuk recurring: status tidak akan pernah 'completed' (pakai quest_daily_completions)
    if (!quest.is_recurring && log.status === 'completed') {
      return NextResponse.json({ error: 'Anda sudah submit quest ini' }, { status: 409 });
    }
    if (log.status !== 'in_progress') {
      return NextResponse.json({ error: 'Status quest tidak valid untuk submit' }, { status: 400 });
    }

    const xpAwarded = quest.xp_reward || 20;
    const todayStr = new Date().toISOString().split('T')[0];

    // 3b. Untuk quest RECURRING: cek race condition (sudah complete hari ini?)
    if (quest.is_recurring) {
      const { data: todayCompletion } = await supabase
        .from('quest_daily_completions')
        .select('id')
        .eq('quest_id', quest_id)
        .eq('intern_id', intern.intern_id)
        .eq('completion_date', todayStr)
        .maybeSingle();
      if (todayCompletion) {
        return NextResponse.json(
          { error: 'Sudah selesai quest ini hari ini. Kembali besok untuk kerjakan lagi.' },
          { status: 409 }
        );
      }
    }

    if (quest.is_recurring) {
      // 4a. RECURRING: INSERT ke quest_daily_completions (1 row per hari)
      // Fallback kalau tabel belum ada (migration belum di-run): pakai quest_logs langsung
      let dailyInsertSuccess = false;
      try {
        const { data: dailyCompletion, error: dErr } = await supabase
          .from('quest_daily_completions')
          .insert({
            quest_id,
            intern_id: intern.intern_id,
            group_id,
            completion_date: todayStr,
            submission_notes: submission_notes?.trim() || null,
            xp_awarded: xpAwarded,
            submitted_at: new Date().toISOString()
          })
          .select()
          .single();
        if (dErr) {
          if (dErr.code === '23505') {
            return NextResponse.json(
              { error: 'Sudah selesai quest ini hari ini (race condition). Reload halaman.' },
              { status: 409 }
            );
          }
          // Tabel belum ada (code 42P01) atau error lain — fallback ke quest_logs
          console.warn('[quests/submit] quest_daily_completions error, fallback to quest_logs:', dErr.message);
        } else {
          dailyInsertSuccess = true;
        }
      } catch (err) {
        console.warn('[quests/submit] quest_daily_completions exception, fallback:', err);
      }

      // 4b. Reset quest_log status ke 'available' supaya besok bisa START lagi
      // Kalau daily_insert success: status='available' (clean state)
      // Kalau fallback: status='available' juga (supaya besok bisa START, walau tanpa audit trail harian)
      await supabase
        .from('quest_logs')
        .update({
          status: 'available',
          started_at: null,
          submitted_at: new Date().toISOString(),
          submission_notes: submission_notes?.trim() || null,
          xp_awarded: xpAwarded
        })
        .eq('id', log.id);
    } else {
      // 4c. NON-RECURRING: Update quest_log: completed (permanen)
      const { error: uErr } = await supabase
        .from('quest_logs')
        .update({
          status: 'completed',
          submitted_at: new Date().toISOString(),
          submission_notes: submission_notes?.trim() || null,
          xp_awarded: xpAwarded
        })
        .eq('id', log.id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

      // 4d. Insert ke activity_completions (hanya untuk non-recurring — recurring pakai quest_daily_completions)
      const { error: upsertErr } = await supabase
        .from('activity_completions')
        .upsert({
          activity_id: quest_id,
          intern_id: intern.intern_id,
          completion_notes: submission_notes?.trim() || `[Quest] Selesai dari grup chat. XP: ${xpAwarded}`
        }, { onConflict: 'activity_id,intern_id' });
      if (upsertErr) {
        console.error('[quests/submit] upsert activity_completions error:', upsertErr);
      }
    }

    // 5. Grant XP ke intern
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();
    const newTotalExp = (internData?.total_exp || 0) + xpAwarded;
    await supabase.from('interns').update({ total_exp: newTotalExp }).eq('id', intern.intern_id);

    // 6. Insert system message di chat
    await supabase.from('chat_messages').insert({
      group_id,
      sender_type: 'system',
      sender_id: intern.intern_id,
      sender_name: 'Sistem',
      message_type: 'system',
      content: `✅ ${intern.name} menyelesaikan quest "${quest.title}" (+${xpAwarded} XP)`
    });

    return NextResponse.json({
      success: true,
      xp_gained: xpAwarded,
      new_total_exp: newTotalExp,
      message: `Quest selesai! +${xpAwarded} XP`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
