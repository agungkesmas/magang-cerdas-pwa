// ============================================================
// /api/activities/intern-create — Intern tambah aktivitas sendiri
// Two-way: peserta bisa catat aktivitas tambahan yang mereka kerjakan
// Support: xp_reward (default 20, pilihan 10/20/30/50)
//
// LIMIT ANTI-EXP-FARMING: maksimal 3 aktivitas self-added per hari
// (standar industri: cegah percobaan up nilai tidak wajar)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

const MAX_DAILY_SELF_ACTIVITIES = 3;

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, xp_reward } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });

    // Validate XP (default 20, allowed: 10/20/30/50)
    const xp = parseInt(xp_reward, 10) || 20;
    if (![10, 20, 30, 50].includes(xp)) {
      return NextResponse.json({ error: 'XP tidak valid (10/20/30/50)' }, { status: 400 });
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

    // 0b. CEK: Batas 3 aktivitas self-added per hari (anti EXP-farming)
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
          error: `Batas penambahan aktivitas harian tercapai (${MAX_DAILY_SELF_ACTIVITIES} aktivitas/hari). Batas ini mencegah percobaan menaikkan nilai EXP secara tidak wajar. Jika ada aktivitas tambahan yang penting, minta pembina untuk menambahkannya melalui DM atau tag langsung.`,
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
        xp_reward: xp
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

