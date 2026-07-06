// ============================================================
// /api/activities/complete — Intern tandai aktivitas selesai
// Mode 1 (non-recurring): +20 EXP (1x saja)
// Mode 2 (recurring harian): +20 EXP per hari, anti-double per hari
//   - Cek jam: harus sebelum daily_deadline_hour (default 17 WIB)
//   - Cek range: today harus dalam start_date..end_date
//   - Cek weekend: kalau skip_weekend, Sabtu/Minggu tidak bisa complete
//   - Bonus: +50 EXP kalau selesai SEMUA hari kerja di range
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

const EXP_REWARD = 20;
const BONUS_EXP_ALL_COMPLETE = 50;

// Helper: hitung jumlah hari kerja dalam range
function countWorkingDays(start: Date, end: Date, skipWeekend: boolean): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setHours(0, 0, 0, 0);
  while (cur <= endCopy) {
    const day = cur.getDay();
    if (skipWeekend && (day === 0 || day === 6)) {
      cur.setDate(cur.getDate() + 1);
      continue;
    }
    count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { activity_id, completion_notes } = await req.json();
    if (!activity_id) return NextResponse.json({ error: 'activity_id wajib diisi' }, { status: 400 });

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
        { error: 'Anda belum check-in hari ini. Lakukan check-in terlebih dahulu sebelum mengerjakan aktivitas.' },
        { status: 403 }
      );
    }

    // 1. Fetch activity
    const { data: activity, error: aErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activity_id)
      .single();
    if (aErr || !activity) {
      return NextResponse.json({ error: 'Aktivitas tidak ditemukan' }, { status: 404 });
    }
    if (!activity.is_active) {
      return NextResponse.json({ error: 'Aktivitas sudah tidak aktif' }, { status: 400 });
    }

    // 2. Verify access
    let hasAccess = false;
    if (activity.intern_id) {
      hasAccess = activity.intern_id === intern.intern_id;
    } else {
      const { data: internData } = await supabase
        .from('interns')
        .select('department')
        .eq('id', intern.intern_id)
        .single();
      hasAccess = internData?.department === activity.department;
    }
    if (!hasAccess) {
      return NextResponse.json({ error: 'Anda tidak punya akses ke aktivitas ini' }, { status: 403 });
    }

    // ============================================================
    // BRANCH 1: RECURRING MODE (HARIAN)
    // ============================================================
    if (activity.is_recurring) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Validasi range
      if (activity.start_date && activity.end_date) {
        const todayMidnight = new Date(today);
        todayMidnight.setHours(0, 0, 0, 0);
        const sd = new Date(activity.start_date);
        sd.setHours(0, 0, 0, 0);
        const ed = new Date(activity.end_date);
        ed.setHours(0, 0, 0, 0);

        if (todayMidnight < sd || todayMidnight > ed) {
          return NextResponse.json({ error: 'Hari ini di luar rentang aktivitas' }, { status: 400 });
        }
      }

      // Validasi weekend
      if (activity.skip_weekend) {
        const day = today.getDay();
        if (day === 0 || day === 6) {
          return NextResponse.json({ error: 'Akhir pekan (Sabtu/Minggu) tidak ada aktivitas' }, { status: 400 });
        }
      }

      // Validasi jam
      if (activity.daily_deadline_hour) {
        const wibHour = (today.getUTCHours() + 7) % 24;
        if (wibHour >= activity.daily_deadline_hour) {
          return NextResponse.json({
            error: `Waktu complete sudah habis. Aktivitas harus diselesaikan sebelum jam ${activity.daily_deadline_hour}:00 WIB.`
          }, { status: 400 });
        }
      }

      // Anti-double: cek apakah sudah complete hari ini
      const { data: existingToday } = await supabase
        .from('activity_daily_completions')
        .select('id')
        .eq('activity_id', activity_id)
        .eq('intern_id', intern.intern_id)
        .eq('completion_date', todayStr)
        .maybeSingle();
      if (existingToday) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini hari ini' }, { status: 409 });
      }

      // Insert completion harian
      const { error: iErr } = await supabase.from('activity_daily_completions').insert({
        activity_id,
        intern_id: intern.intern_id,
        completion_date: todayStr,
        completion_notes: completion_notes?.trim() || null,
        exp_awarded: (activity.xp_reward || EXP_REWARD),
        bonus_exp_awarded: 0
      });
      if (iErr) {
        if (iErr.code === '23505') {
          return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini hari ini' }, { status: 409 });
        }
        return NextResponse.json({ error: iErr.message }, { status: 500 });
      }

      // Cek bonus: apakah sudah complete SEMUA hari kerja di range?
      let bonusExp = 0;
      let allComplete = false;
      if (activity.start_date && activity.end_date) {
        const totalDays = countWorkingDays(new Date(activity.start_date), new Date(activity.end_date), activity.skip_weekend);
        const { data: allMyCompletions } = await supabase
          .from('activity_daily_completions')
          .select('id, completion_date')
          .eq('activity_id', activity_id)
          .eq('intern_id', intern.intern_id);
        const myCount = (allMyCompletions || []).length;

        if (myCount >= totalDays) {
          // Sudah complete semua → bonus
          bonusExp = BONUS_EXP_ALL_COMPLETE;
          allComplete = true;
          // Update baris terakhir dengan bonus_exp
          await supabase
            .from('activity_daily_completions')
            .update({ bonus_exp_awarded: bonusExp })
            .eq('activity_id', activity_id)
            .eq('intern_id', intern.intern_id)
            .eq('completion_date', todayStr);
        }
      }

      // Grant EXP
      const totalExpGain = (activity.xp_reward || EXP_REWARD) + bonusExp;
      const { data: internData } = await supabase
        .from('interns')
        .select('total_exp')
        .eq('id', intern.intern_id)
        .single();
      const newTotalExp = (internData?.total_exp || 0) + totalExpGain;
      await supabase.from('interns').update({ total_exp: newTotalExp }).eq('id', intern.intern_id);

      return NextResponse.json({
        success: true,
        mode: 'recurring',
        exp_gained: (activity.xp_reward || EXP_REWARD),
        bonus_exp: bonusExp,
        total_exp_gained: totalExpGain,
        new_total_exp: newTotalExp,
        all_complete: allComplete,
        message: allComplete
          ? `🎉 Selamat! Anda menyelesaikan SEMUA hari kerja. Bonus +${bonusExp} EXP!`
          : `+${(activity.xp_reward || EXP_REWARD)} EXP! Tugas akan muncul lagi besok.`
      });
    }

    // ============================================================
    // BRANCH 2: NON-RECURRING MODE (MODE LAMA)
    // ============================================================
    if (activity.due_date && new Date(activity.due_date).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Aktivitas sudah lewat deadline' }, { status: 400 });
    }

    // Anti-exploit
    if (activity.intern_id) {
      if (activity.completed_by_intern_id === intern.intern_id) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini' }, { status: 409 });
      }
    } else {
      const { data: existing } = await supabase
        .from('activity_completions')
        .select('id')
        .eq('activity_id', activity_id)
        .eq('intern_id', intern.intern_id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini' }, { status: 409 });
      }
    }

    // Mark as completed
    if (activity.intern_id) {
      const { error: uErr } = await supabase
        .from('activities')
        .update({
          completed_by_intern_id: intern.intern_id,
          completed_at: new Date().toISOString(),
          completion_notes: completion_notes?.trim() || null
        })
        .eq('id', activity_id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    } else {
      const { error: iErr } = await supabase.from('activity_completions').insert({
        activity_id,
        intern_id: intern.intern_id,
        completion_notes: completion_notes?.trim() || null
      });
      if (iErr) {
        if (iErr.code === '23505') {
          return NextResponse.json({ error: 'Anda sudah menyelesaikan aktivitas ini' }, { status: 409 });
        }
        return NextResponse.json({ error: iErr.message }, { status: 500 });
      }
    }

    // Grant EXP
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();
    const newTotalExp = (internData?.total_exp || 0) + (activity.xp_reward || EXP_REWARD);
    await supabase.from('interns').update({ total_exp: newTotalExp }).eq('id', intern.intern_id);

    return NextResponse.json({
      success: true,
      mode: 'single',
      exp_gained: (activity.xp_reward || EXP_REWARD),
      bonus_exp: 0,
      total_exp_gained: (activity.xp_reward || EXP_REWARD),
      new_total_exp: newTotalExp,
      all_complete: true,
      message: `+${(activity.xp_reward || EXP_REWARD)} EXP!`
    });
  } catch (e: any) {
    console.error('[activities/complete] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
