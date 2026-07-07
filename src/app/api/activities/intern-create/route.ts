// ============================================================
// /api/activities/intern-create — Intern tambah aktivitas sendiri
//
// LIMIT ANTI-EXP-FARMING:
// - Self-added: maksimal 2 per hari
// - Quest: maksimal 2 per hari (di API quests/start)
// - Total (quest + self-added): maksimal 3 per hari
// - Aktivitas ke-3: harus ada jeda 3 jam dari aktivitas ke-2
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

const MAX_DAILY_SELF_ACTIVITIES = 2;
const MAX_DAILY_TOTAL = 3;
const THIRD_ACTIVITY_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 jam

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, xp_reward, related_department } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });

    // Validate XP (default 20, allowed: 10/20/30/50)
    const xp = parseInt(xp_reward, 10) || 20;
    if (![10, 20, 30, 50].includes(xp)) {
      return NextResponse.json({ error: 'XP tidak valid (10/20/30/50)' }, { status: 400 });
    }

    // Validate related_department (opsional — boleh null)
    // Tujuan: peserta kasih sinyal "aktivitas ini berhubungan dengan bidang X"
    // supaya pembina divisi X bisa cepat filter & kasih gift
    const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang'];
    const relatedDept = related_department && related_department.trim()
      ? related_department.trim()
      : null;
    if (relatedDept && !VALID_DEPARTMENTS.includes(relatedDept)) {
      return NextResponse.json(
        { error: `Bidang terkait tidak valid. Pilih: ${VALID_DEPARTMENTS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 0. CEK: Peserta sudah check-in hari ini?
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const { data: todayCheckIn } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', todayStart.toISOString())
      .maybeSingle();
    if (!todayCheckIn) {
      return NextResponse.json(
        { error: 'Anda belum check-in hari ini. Lakukan check-in terlebih dahulu sebelum menambah aktivitas.' },
        { status: 403 }
      );
    }

    // 0a. CEK: Peserta sudah check-out hari ini? (tidak bisa tambah aktivitas baru)
    const { data: todayCheckOut } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-Out')
      .gte('timestamp', todayStart.toISOString())
      .maybeSingle();
    if (todayCheckOut) {
      return NextResponse.json(
        { error: 'Anda sudah check-out hari ini. Tidak bisa menambah aktivitas baru. Kamu masih bisa menyelesaikan aktivitas yang sudah ada.' },
        { status: 403 }
      );
    }

    // 0b. CEK: Batas self-added + total + jeda 3 jam
    const { count: todaySelfActivities } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('intern_id', intern.intern_id)
      .eq('created_by_intern', true)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    // Cek quest count hari ini
    let questCountToday = 0;
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { count: qc } = await supabase
        .from('quest_daily_completions')
        .select('id', { count: 'exact', head: true })
        .eq('intern_id', intern.intern_id)
        .eq('completion_date', todayStr);
      questCountToday = qc || 0;
    } catch {}

    const selfN = todaySelfActivities || 0;
    const questN = questCountToday;
    const totalN = selfN + questN;

    // Self-added max 2
    if (selfN >= MAX_DAILY_SELF_ACTIVITIES) {
      return NextResponse.json(
        { error: `Batas penambahan aktivitas mandiri tercapai (maksimal ${MAX_DAILY_SELF_ACTIVITIES} per hari).` + (questN < 2 ? ' Kamu masih bisa mengerjakan quest.' : '') },
        { status: 429 }
      );
    }
    // Total max 3
    if (totalN >= MAX_DAILY_TOTAL) {
      return NextResponse.json(
        { error: `Batas harian tercapai (maksimal ${MAX_DAILY_TOTAL} aktivitas per hari). Kembali besok.` },
        { status: 429 }
      );
    }

    // JEDA 3 JAM untuk aktivitas ke-3
    if (totalN >= 2) {
      let latestTime: Date | null = null;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: lq } = await supabase
          .from('quest_daily_completions')
          .select('submitted_at')
          .eq('intern_id', intern.intern_id)
          .eq('completion_date', todayStr)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lq?.submitted_at) latestTime = new Date(lq.submitted_at);
      } catch {}
      const { data: ls } = await supabase
        .from('activities')
        .select('created_at')
        .eq('intern_id', intern.intern_id)
        .eq('created_by_intern', true)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ls?.created_at) {
        const st = new Date(ls.created_at);
        if (!latestTime || st > latestTime) latestTime = st;
      }
      if (latestTime) {
        const elapsed = Date.now() - latestTime.getTime();
        if (elapsed < THIRD_ACTIVITY_COOLDOWN_MS) {
          const remaining = Math.ceil((THIRD_ACTIVITY_COOLDOWN_MS - elapsed) / (60 * 1000));
          const hrs = Math.floor(remaining / 60);
          const mns = remaining % 60;
          return NextResponse.json(
            { error: `Aktivitas ke-3 harus menunggu jeda 3 jam dari aktivitas sebelumnya. Tunggu ${hrs} jam ${mns} menit lagi.` },
            { status: 429 }
          );
        }
      }
    }

    const { data, error } = await supabase
      .from('activities')
      .insert({
        title: title.trim(),
        description: description.trim(),
        intern_id: intern.intern_id,
        department: null,
        is_active: true,
        is_archived: false,
        created_by_intern: true,
        xp_reward: xp,
        related_department: relatedDept
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      activity: data,
      remaining_today: MAX_DAILY_SELF_ACTIVITIES - ((todaySelfActivities || 0) + 1)
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

