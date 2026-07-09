// ============================================================
// /api/attendance/check-out — Check-out with optional photo
//
// Logic approval (sama dengan check-in):
// - Weekday normal: langsung approved, EXP langsung
// - Weekend/hari libur: pending approval pembina, EXP belum diberikan
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { haversineDistance, EXP_REWARDS, getWIBTodayRange } from '@/lib/utils';
import { getHolidayInfo } from '@/lib/holidays';
import { ensureCustomHolidaysLoaded } from '@/lib/holidays-loader';

function checkIfHolidayCheckin(): { isHoliday: boolean; reason: string } {
  const now = new Date();
  const wibDayStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' });
  if (wibDayStr === 'Sun' || wibDayStr === 'Sat') {
    return { isHoliday: true, reason: 'Weekend (Sabtu/Minggu)' };
  }
  const holidayInfo = getHolidayInfo(now);
  if (holidayInfo) {
    return { isHoliday: true, reason: `Hari libur: ${holidayInfo.name}` };
  }
  return { isHoliday: false, reason: '' };
}

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureCustomHolidaysLoaded();

    const { latitude, longitude, photo_url, notes } = await req.json();
    const supabase = createServerClient();

    // Verify checked in today (timezone WIB)
    const { start: wibStart, end: wibEnd } = getWIBTodayRange();
    const { data: checkIn } = await supabase
      .from('attendance')
      .select('id, approval_status')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', wibStart.toISOString())
      .lte('timestamp', wibEnd.toISOString())
      .maybeSingle();

    if (!checkIn) {
      return NextResponse.json({ error: 'Anda belum check-in hari ini' }, { status: 400 });
    }

    // Check not already checked out
    const { data: checkOut } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-Out')
      .gte('timestamp', wibStart.toISOString())
      .lte('timestamp', wibEnd.toISOString())
      .maybeSingle();

    if (checkOut) {
      return NextResponse.json({ error: 'Anda sudah check-out hari ini' }, { status: 400 });
    }

    // ============================================================
    // GATE: Peserta harus menyelesaikan (atau batalkan) semua quest
    // yang sedang in_progress sebelum bisa check-out pulang.
    // Tujuan: mencegah "sampah" quest yang di-START tapi ditinggal.
    // ============================================================
    const { data: pendingQuests } = await supabase
      .from('quest_logs')
      .select(`
        id,
        quest_id,
        started_at,
        activities!inner(id, title, is_active)
      `)
      .eq('intern_id', intern.intern_id)
      .eq('status', 'in_progress')
      .eq('activities.is_active', true);

    if (pendingQuests && pendingQuests.length > 0) {
      const questList = pendingQuests
        .map((q: any, i: number) => `${i + 1}. ${q.activities?.title || 'Quest tanpa judul'}`)
        .join('\n');
      return NextResponse.json(
        {
          error: `Check-out DITOLAK. Anda masih memiliki ${pendingQuests.length} quest yang sedang dikerjakan dan belum diselesaikan:\n\n${questList}\n\nSilakan SUBMIT quest (dengan keterangan minimal 15 karakter) jika sudah selesai, atau BATALKAN quest di halaman Aktivitas jika tidak bisa diselesaikan hari ini.`,
          blocked_by_pending_quests: true,
          pending_quest_count: pendingQuests.length,
          pending_quests: pendingQuests.map((q: any) => ({
            quest_id: q.quest_id,
            title: q.activities?.title
          }))
        },
        { status: 409 }
      );
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, geofence_radius_meters')
      .eq('id', 1)
      .single();

    const officeLat = settings?.office_lat ?? -6.7409720;
    const officeLng = settings?.office_lng ?? 108.5430931;
    const radius = settings?.geofence_radius_meters ?? 200;

    const distance =
      latitude && longitude ? haversineDistance(latitude, longitude, officeLat, officeLng) : null;
    const isWithin = distance !== null ? distance <= radius : false;

    // Cek holiday/weekend
    const holidayCheck = checkIfHolidayCheckin();

    // ============================================================
    // ENFORCE GEOFENCE untuk check-out (sama seperti check-in)
    // ============================================================
    if (latitude && longitude && !isWithin && !holidayCheck.isHoliday) {
      return NextResponse.json(
        {
          error: `Check-out GAGAL. Anda berada ${distance}m dari kantor (radius maksimal ${radius}m). Check-out harus dari lokasi kantor BPJS. Kalau Anda sudah di kantor, coba refresh GPS atau bergerak ke area yang lebih terbuka.`,
          distance,
          radius,
          is_within_geofence: false
        },
        { status: 403 }
      );
    }

    // Cek pulang awal: check-out sebelum 17:00 WIB = pulang awal
    const wibHourStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    const [coHour, coMin] = wibHourStr.split(':').map(n => parseInt(n, 10));
    const coTotalMin = coHour * 60 + coMin;
    const CHECKOUT_EARLIEST_MIN = 17 * 60; // 17:00 = 1020 menit
    const isEarly = coTotalMin < CHECKOUT_EARLIEST_MIN;

    const { data: att, error } = await supabase
      .from('attendance')
      .insert({
        intern_id: intern.intern_id,
        type: 'Check-Out',
        latitude: latitude || null,
        longitude: longitude || null,
        distance_meters: distance,
        photo_url: photo_url || null,
        is_within_geofence: isWithin,
        notes: notes || null,
        is_holiday_checkin: holidayCheck.isHoliday,
        is_early: isEarly,
        approval_status: holidayCheck.isHoliday ? 'pending' : 'approved'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Kalau holiday → pending, EXP belum diberikan
    if (holidayCheck.isHoliday) {
      return NextResponse.json({
        success: true,
        attendance: att,
        exp_gained: 0,
        pending_approval: true,
        approval_reason: holidayCheck.reason,
        message: `Check-out berhasil, tapi ${holidayCheck.reason}. Menunggu persetujuan pembina. EXP akan diberikan setelah disetujui.`
      });
    }

    // Weekday normal → Grant EXP
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();

    if (internData) {
      const newExp = (internData.total_exp || 0) + EXP_REWARDS.CHECK_OUT;
      await supabase.from('interns').update({ total_exp: newExp }).eq('id', intern.intern_id);
    }

    return NextResponse.json({
      success: true,
      attendance: att,
      exp_gained: EXP_REWARDS.CHECK_OUT,
      new_total_exp: (internData?.total_exp || 0) + EXP_REWARDS.CHECK_OUT,
      is_early: isEarly,
      warning: isEarly
        ? `⚠️ Anda check-out lebih awal (jam ${wibHourStr} WIB). Check-out seharusnya setelah jam 17:00 WIB. Pulang awal tercatat di sistem — mohon lebih disiplin besok.`
        : undefined
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
