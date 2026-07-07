// ============================================================
// /api/activities/intern-create — Intern tambah aktivitas sendiri
// Two-way: peserta bisa catat aktivitas tambahan yang mereka kerjakan
// Support: xp_reward (default 20, pilihan 10/20/30/50)
//
// LIMIT ANTI-EXP-FARMING:
// - Maksimal 1 aktivitas self-added per hari (independent dari quest)
// - Quest punya limit sendiri: maksimal 2 per hari (di API quests/start)
// - Tidak ada total limit — masing-masing independent
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

const MAX_DAILY_SELF_ACTIVITIES = 1;

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

    // 0b. CEK: Batas 1 aktivitas self-added per hari (independent dari quest)
    const { count: todaySelfActivities } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('intern_id', intern.intern_id)
      .eq('created_by_intern', true)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if ((todaySelfActivities || 0) >= MAX_DAILY_SELF_ACTIVITIES) {
      return NextResponse.json(
        {
          error: `Batas penambahan aktivitas mandiri tercapai (maksimal ${MAX_DAILY_SELF_ACTIVITIES} per hari). Kamu masih bisa mengerjakan quest dari menu Aktivitas.`,
          limit: MAX_DAILY_SELF_ACTIVITIES,
          remaining: 0
        },
        { status: 429 }
      );
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

