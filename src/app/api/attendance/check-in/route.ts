// ============================================================
// /api/attendance/check-in — Geofenced + camera check-in
//
// Logic approval:
// - Weekday normal (Sen-Jum, bukan libur): langsung approved, EXP langsung
// - Weekend (Sabtu/Minggu) ATAU hari libur: pending approval pembina
//   * EXP BELUM diberikan sampai pembina approve
//   * Peserta tetap bisa check-in (mungkin ditugaskan di hari libur)
//   * Pembina approve → EXP diberikan + nudge ke peserta
//   * Pembina reject → EXP tidak diberikan
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { haversineDistance, EXP_REWARDS, getWIBTodayRange, getWIBToday } from '@/lib/utils';
import { isHoliday, getHolidayInfo } from '@/lib/holidays';
import { ensureCustomHolidaysLoaded } from '@/lib/holidays-loader';

// Cek apakah hari ini weekend atau hari libur (timezone WIB)
function checkIfHolidayCheckin(): { isHoliday: boolean; reason: string } {
  const now = new Date();
  // Pakai timezone WIB untuk tentukan hari
  const wibDayStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' });
  // 'Sun' atau 'Sat'
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

    // Load custom holidays untuk deteksi hari libur BPJS-specific
    await ensureCustomHolidaysLoaded();

    const { latitude, longitude, photo_url, notes } = await req.json();
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Koordinat GPS tidak valid' }, { status: 400 });
    }

    // Get office coords from App_Settings
    const supabase = createServerClient();
    const { data: settings } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, geofence_radius_meters')
      .eq('id', 1)
      .single();

    const officeLat = settings?.office_lat ?? parseFloat(process.env.NEXT_PUBLIC_GEOLOC_OFFICE_LAT || '-6.7409720');
    const officeLng = settings?.office_lng ?? parseFloat(process.env.NEXT_PUBLIC_GEOLOC_OFFICE_LNG || '108.5430931');
    const radius = settings?.geofence_radius_meters ?? 150;

    const distance = haversineDistance(latitude, longitude, officeLat, officeLng);
    const isWithin = distance <= radius;

    if (!isWithin) {
      return NextResponse.json(
        {
          error: `Anda berada ${distance}m dari kantor. Radius maksimal ${radius}m.`,
          distance,
          radius
        },
        { status: 403 }
      );
    }

    // Check if already checked in today (timezone WIB)
    const { start: wibStart, end: wibEnd } = getWIBTodayRange();
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', wibStart.toISOString())
      .lte('timestamp', wibEnd.toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Anda sudah check-in hari ini' }, { status: 400 });
    }

    // Cek apakah hari ini ada izin yang approved
    const today = getWIBToday();
    const { data: approvedLeave } = await supabase
      .from('leave_requests')
      .select('id, type')
      .eq('intern_id', intern.intern_id)
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle();

    if (approvedLeave) {
      const typeLabel = approvedLeave.type === 'sakit' ? 'sakit' : approvedLeave.type === 'dinas-luar' ? 'dinas luar' : approvedLeave.type;
      return NextResponse.json(
        { error: `Anda sedang ${typeLabel} hari ini (izin disetujui). Tidak perlu check-in.` },
        { status: 400 }
      );
    }

    // Cek apakah check-in di hari libur/weekend (butuh approval pembina)
    const holidayCheck = checkIfHolidayCheckin();

    // Cek keterlambatan: check-in setelah 08:00 WIB
    // Grace period 15 menit (08:00-08:15) = tidak dianggap terlambat
    const wibHourStr = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false });
    const [ciHour, ciMin] = wibHourStr.split(':').map((n: string) => parseInt(n, 10));
    const ciTotalMin = ciHour * 60 + ciMin;
    const CHECKIN_DEADLINE_MIN = 8 * 60;       // 08:00 = 480
    const GRACE_PERIOD_END = 8 * 60 + 15;      // 08:15 = 495
    const LATE_LIGHT_END = 8 * 60 + 30;        // 08:30 = 510
    const LATE_MODERATE_END = 9 * 60;          // 09:00 = 540

    // Tentukan tier keterlambatan + EXP
    let isLate = false;
    let expToGrant: number = EXP_REWARDS.CHECK_IN; // default 20
    let lateTier: 'on_time' | 'grace' | 'light' | 'moderate' | 'heavy' = 'on_time';

    if (ciTotalMin <= CHECKIN_DEADLINE_MIN) {
      // ≤ 08:00 — tepat waktu, full EXP
      lateTier = 'on_time';
      isLate = false;
      expToGrant = EXP_REWARDS.CHECK_IN; // 20
    } else if (ciTotalMin <= GRACE_PERIOD_END) {
      // 08:01 - 08:15 — grace period, full EXP, tidak flag late
      lateTier = 'grace';
      isLate = false;
      expToGrant = EXP_REWARDS.CHECK_IN; // 20
    } else if (ciTotalMin <= LATE_LIGHT_END) {
      // 08:16 - 08:30 — terlambat ringan, 75% EXP
      lateTier = 'light';
      isLate = true;
      expToGrant = 15;
    } else if (ciTotalMin <= LATE_MODERATE_END) {
      // 08:31 - 09:00 — terlambat sedang, 50% EXP
      lateTier = 'moderate';
      isLate = true;
      expToGrant = 10;
    } else {
      // > 09:00 — terlambat berat, 25% EXP
      lateTier = 'heavy';
      isLate = true;
      expToGrant = 5;
    }

    // Insert attendance
    const { data: att, error } = await supabase
      .from('attendance')
      .insert({
        intern_id: intern.intern_id,
        type: 'Check-In',
        latitude,
        longitude,
        distance_meters: distance,
        photo_url,
        is_within_geofence: true,
        notes: notes || null,
        is_holiday_checkin: holidayCheck.isHoliday,
        is_late: isLate,
        approval_status: holidayCheck.isHoliday ? 'pending' : 'approved'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Kalau holiday/weekend → pending approval, EXP BELUM diberikan
    if (holidayCheck.isHoliday) {
      return NextResponse.json({
        success: true,
        attendance: att,
        exp_gained: 0,
        distance_meters: distance,
        pending_approval: true,
        approval_reason: holidayCheck.reason,
        message: `Check-in berhasil, tapi ${holidayCheck.reason}. Check-in Anda menunggu persetujuan pembina. EXP akan diberikan setelah disetujui.`
      });
    }

    // Weekday normal → Grant EXP berjenjang berdasarkan keterlambatan
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp, streak_count')
      .eq('id', intern.intern_id)
      .single();

    if (internData) {
      const newExp = (internData.total_exp || 0) + expToGrant;
      const newStreak = (internData.streak_count || 0) + 1;
      await supabase
        .from('interns')
        .update({ total_exp: newExp, streak_count: newStreak })
        .eq('id', intern.intern_id);
    }

    // ============================================================
    // PESAN EDUKASI — penuh kasih, anak muda formal, tidak galak
    // ============================================================
    let lateEducation: any = undefined;

    if (isLate) {
      // Hitung berapa kali terlambat minggu ini & bulan ini
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const { data: recentCIs } = await supabase
        .from('attendance')
        .select('timestamp, is_late')
        .eq('intern_id', intern.intern_id)
        .eq('type', 'Check-In')
        .eq('is_late', true)
        .gte('timestamp', weekAgo.toISOString());
      const lateThisWeek = recentCIs?.length || 0;

      const { data: monthCIs } = await supabase
        .from('attendance')
        .select('timestamp')
        .eq('intern_id', intern.intern_id)
        .eq('type', 'Check-In')
        .eq('is_late', true)
        .gte('timestamp', monthAgo.toISOString());
      const lateThisMonth = monthCIs?.length || 0;

      // Pesan berjenjang — SINGKAT, penuh kasih, edukatif
      let msg = '';
      if (lateTier === 'light') {
        msg = `Sedikit telat ya! EXP hari ini 75% (${expToGrant} dari 20). Besok lebih awal ya, semangat! ✨`;
      } else if (lateTier === 'moderate') {
        msg = `Telat setengah jam. EXP 50% (${expToGrant} dari 20). Besok berangkat lebih pagi ya! 🙌`;
      } else {
        msg = `Telat lebih 1 jam. EXP 25% (${expToGrant} dari 20). Kalau ada kendala, hubungi admin ya — mereka siap bantu. 💪`;
      }

      // Escalation SINGKAT berdasarkan frekuensi
      if (lateThisMonth >= 5) {
        msg += `\n\n⚠️ Sudah ${lateThisMonth}x telat bulan ini. Yuk hubungi admin BPJS untuk diskusi solusi.`;
      } else if (lateThisWeek >= 3) {
        msg += `\n\n📌 Sudah ${lateThisWeek}x telat minggu ini. Ada kendala? Coba diskusi sama admin ya.`;
      }

      lateEducation = {
        late_tier: lateTier,
        exp_granted: expToGrant,
        exp_full: EXP_REWARDS.CHECK_IN,
        exp_lost: EXP_REWARDS.CHECK_IN - expToGrant,
        late_this_week: lateThisWeek,
        late_this_month: lateThisMonth,
        check_in_time: wibHourStr,
        message: msg
      };
    }

    // ============================================================
    // CEK "LUPA ABSEN PULANG" KEMARIN
    // Kalau kemarin ada check-in tapi tidak ada check-out → warning
    // + hitung total lupa absen pulang (30 hari terakhir)
    // ============================================================
    let forgotCheckoutWarning: any = undefined;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const yStart = new Date(`${yesterdayStr}T00:00:00+07:00`).toISOString();
    const yEnd = new Date(`${yesterdayStr}T23:59:59.999+07:00`).toISOString();

    const { data: yCI } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', yStart)
      .lte('timestamp', yEnd)
      .maybeSingle();

    const { data: yCO } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-Out')
      .gte('timestamp', yStart)
      .lte('timestamp', yEnd)
      .maybeSingle();

    const forgotYesterday = yCI && !yCO;

    if (forgotYesterday) {
      // Hitung total lupa absen pulang (30 hari terakhir)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: allCIs } = await supabase
        .from('attendance')
        .select('timestamp')
        .eq('intern_id', intern.intern_id)
        .eq('type', 'Check-In')
        .gte('timestamp', thirtyDaysAgo.toISOString());
      const { data: allCOs } = await supabase
        .from('attendance')
        .select('timestamp')
        .eq('intern_id', intern.intern_id)
        .eq('type', 'Check-Out')
        .gte('timestamp', thirtyDaysAgo.toISOString());

      const coDates = new Set(
        (allCOs || []).map(co =>
          new Date(co.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
        )
      );
      const forgotDates = new Set(
        (allCIs || [])
          .filter(ci => {
            const ciDate = new Date(ci.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
            return !coDates.has(ciDate);
          })
          .map(ci => new Date(ci.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }))
      );
      const forgotCount = forgotDates.size;

      // Format tanggal kemarin (mis. "Senin, 7 Jul")
      const yDateObj = new Date(yesterdayStr + 'T12:00:00+07:00');
      const yFormatted = yDateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

      // Pesan edukasi — anak muda tapi formal, tidak galak
      const remaining = 5 - forgotCount;
      let msg = `Heads up! Kemarin (${yFormatted}) kamu lupa absen pulang ya? Santai, bisa dikoreksi kok — scroll ke bawah ke menu "Rekap Absen", pilih tanggal ${yFormatted}, lalu ajukan koreksi absen.\n\n`;
      msg += `Sampai saat ini sudah ${forgotCount}x lupa absen pulang (batas 5x).`;
      if (remaining <= 0) {
        msg += `\n\n⚠️ Kamu sudah mencapai batas 5x lupa absen. Mohon segera hubungi admin BPJS untuk konsultasi — mereka pasti bantu ko. Jangan ragu ya!`;
      } else if (remaining <= 2) {
        msg += `\n\nHati-hati ya, tinggal ${remaining}x lagi. Kalau ada kendala absen, jangan tunggu — hubungi admin langsung. Stay disiplin, semangat! 🙌`;
      } else {
        msg += `\n\nTinggal ${remaining}x lagi batasnya. Tetap semangat dan jangan lupa absen pulang ya! ✨`;
      }

      forgotCheckoutWarning = {
        forgot_yesterday: true,
        yesterday_date: yFormatted,
        total_forgot_count: forgotCount,
        remaining: Math.max(0, remaining),
        message: msg
      };
    }

    return NextResponse.json({
      success: true,
      attendance: att,
      exp_gained: expToGrant,
      exp_full: EXP_REWARDS.CHECK_IN,
      exp_lost: EXP_REWARDS.CHECK_IN - expToGrant,
      late_tier: lateTier,
      distance_meters: distance,
      new_total_exp: (internData?.total_exp || 0) + expToGrant,
      is_late: isLate,
      late_education: lateEducation,
      forgot_checkout_warning: forgotCheckoutWarning
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
