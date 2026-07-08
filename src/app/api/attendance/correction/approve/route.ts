// ============================================================
// /api/attendance/correction/approve — Admin approve koreksi absen
//
// POST { correction_id, review_notes }
//
// Saat approve:
// 1. Update status correction → approved
// 2. Insert record attendance dengan timestamp default:
//    - Check-In: 08:00 WIB tanggal tersebut
//    - Check-Out: 17:00 WIB tanggal tersebut
// 3. distance_meters = 0, is_within_geofence = true
// 4. Grant EXP sesuai tipe (CI +20, CO +10)
// 5. Send nudge ke peserta: "Koreksi absen Anda disetujui"
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';
import { EXP_REWARDS } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized — admin atau pembina only' }, { status: 401 });
    }
    const reviewerId = admin?.sub || pembina?.pembina_id;
    const reviewerName = admin?.name || pembina?.name || 'Pembina';
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { correction_id, review_notes } = await req.json();
    if (!correction_id) {
      return NextResponse.json({ error: 'correction_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get correction
    const { data: correction, error: cErr } = await supabase
      .from('attendance_corrections')
      .select(`
        id,
        intern_id,
        correction_date,
        type,
        reason,
        status,
        actual_time,
        interns!inner(name, username)
      `)
      .eq('id', correction_id)
      .single();

    if (cErr || !correction) {
      return NextResponse.json({ error: 'Koreksi tidak ditemukan' }, { status: 404 });
    }

    if (correction.status !== 'pending') {
      return NextResponse.json({ error: `Koreksi sudah ${correction.status} — tidak bisa diproses ulang` }, { status: 400 });
    }

    // Cek apakah sudah ada record attendance untuk tanggal + tipe ini
    // (double-check, mungkin peserta sudah absen manual setelah ajukan koreksi)
    const dateStr = correction.correction_date;
    const dateStart = new Date(`${dateStr}T00:00:00+07:00`).toISOString();
    const dateEnd = new Date(`${dateStr}T23:59:59.999+07:00`).toISOString();
    const { data: existingAtt } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', correction.intern_id)
      .eq('type', correction.type)
      .gte('timestamp', dateStart)
      .lte('timestamp', dateEnd)
      .maybeSingle();

    if (existingAtt) {
      // Sudah ada record — reject koreksi otomatis
      await supabase
        .from('attendance_corrections')
        .update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_notes: 'Auto-rejected: record absen sudah ada (peserta mungkin sudah absen manual setelah ajukan koreksi)'
        })
        .eq('id', correction_id);

      return NextResponse.json({
        success: false,
        message: 'Koreksi auto-rejected karena record absen sudah ada',
        auto_rejected: true
      });
    }

    // Buat timestamp dari actual_time yang diinput peserta
    // Format: correction_date + actual_time (HH:MM) + WIB timezone
    const actualTimeStr = correction.actual_time || (correction.type === 'Check-In' ? '08:00:00' : '17:00:00');
    const attTimestamp = new Date(`${dateStr}T${actualTimeStr}:00+07:00`).toISOString();

    // Hitung is_late/is_early dari actual_time
    const [actHour, actMin] = actualTimeStr.split(':').map((n: string) => parseInt(n, 10));
    const actTotalMin = actHour * 60 + actMin;
    const CHECKIN_DEADLINE = 8 * 60;  // 08:00
    const CHECKOUT_EARLIEST = 17 * 60; // 17:00
    const isLate = correction.type === 'Check-In' && actTotalMin > CHECKIN_DEADLINE;
    const isEarly = correction.type === 'Check-Out' && actTotalMin < CHECKOUT_EARLIEST;

    // Insert attendance record dengan actual_time sebagai timestamp
    const { error: attErr } = await supabase
      .from('attendance')
      .insert({
        intern_id: correction.intern_id,
        type: correction.type,
        timestamp: attTimestamp,
        latitude: null,
        longitude: null,
        distance_meters: 0,
        photo_url: null,
        is_within_geofence: true,
        notes: `Koreksi absen diapprove admin. Jam sebenarnya: ${actualTimeStr}. Alasan: ${correction.reason.substring(0, 100)}`,
        is_holiday_checkin: false,
        is_late: isLate,
        is_early: isEarly,
        approval_status: 'approved',
        is_correction: true,
        correction_id: correction.id
      });

    if (attErr) {
      console.error('[correction/approve] insert attendance error:', attErr);
      // Lanjutkan walau ada error — update status correction tetap
    }

    // Update correction status
    const { error: updateErr } = await supabase
      .from('attendance_corrections')
      .update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes?.trim() || 'Diapprove oleh admin/pembina'
      })
      .eq('id', correction_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // ============================================================
    // PUNISHMENT: EXP 50% untuk koreksi ke-4 dan ke-5 per bulan
    // Hitung jumlah koreksi bulan ini (termasuk yang ini)
    // ============================================================
    const monthStart = dateStr.substring(0, 8) + '01';
    const monthEnd = dateStr.substring(0, 8) + '31';
    const { count: monthCount } = await supabase
      .from('attendance_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('intern_id', correction.intern_id)
      .gte('correction_date', monthStart)
      .lte('correction_date', monthEnd)
      .neq('status', 'rejected');

    const totalThisMonth = (monthCount || 0); // sudah include yang ini (just approved)
    const baseExp = correction.type === 'Check-In' ? EXP_REWARDS.CHECK_IN : EXP_REWARDS.CHECK_OUT;
    const expMultiplier = totalThisMonth >= 4 ? 0.5 : 1.0; // ke-4 dan ke-5: 50%
    const expGain = Math.round(baseExp * expMultiplier);
    const expNote = expMultiplier < 1
      ? ` (EXP dipotong 50% — ini koreksi ke-${totalThisMonth} bulan ini)`
      : '';

    // Grant EXP
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp, streak_count')
      .eq('id', correction.intern_id)
      .single();

    if (internData) {
      const newExp = (internData.total_exp || 0) + expGain;
      const updates: any = { total_exp: newExp };
      if (correction.type === 'Check-In') {
        updates.streak_count = (internData.streak_count || 0) + 1;
      }
      await supabase.from('interns').update(updates).eq('id', correction.intern_id);
    }

    // Nudge peserta
    const intern = correction.interns as any;
    await supabase.from('nudges').insert({
      intern_id: correction.intern_id,
      message: `✅ Koreksi ${correction.type} tanggal ${dateStr} jam ${actualTimeStr} DISETUJUI. Record absen ditambahkan (+${expGain} EXP${expNote}). ${isLate ? '⚠️ Tercatat terlambat. ' : ''}${isEarly ? '🏠 Tercatat pulang awal. ' : ''}Catatan admin: ${review_notes?.trim() || 'Diapprove'}.`,
      type: 'correction_approved',
      created_by_type: 'admin',
      created_by_id: reviewerId,
      created_by_name: reviewerName
    });

    return NextResponse.json({
      success: true,
      message: `Koreksi ${correction.type} ${intern.name} tanggal ${dateStr} DISETUJUI. Record absen ditambahkan +${expGain} EXP. Nudge terkirim ke peserta.`,
      correction_id: correction.id,
      intern_name: intern.name,
      exp_gained: expGain
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
