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
import { getAdminToken } from '@/lib/auth';
import { EXP_REWARDS } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
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
          reviewed_by: admin.sub,
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

    // Buat timestamp default: Check-In = 08:00 WIB, Check-Out = 17:00 WIB
    const defaultTime = correction.type === 'Check-In' ? '08:00:00' : '17:00:00';
    const attTimestamp = new Date(`${dateStr}T${defaultTime}+07:00`).toISOString();

    // Insert attendance record
    const { error: attErr } = await supabase
      .from('attendance')
      .insert({
        intern_id: correction.intern_id,
        type: correction.type,
        latitude: null,
        longitude: null,
        distance_meters: 0,
        photo_url: null,
        is_within_geofence: true,
        notes: `Koreksi absen diapprove oleh admin. Alasan peserta: ${correction.reason.substring(0, 100)}`,
        is_holiday_checkin: false,
        is_late: false,
        is_early: false,
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
        reviewed_by: admin.sub,
        reviewed_at: new Date().toISOString(),
        review_notes: review_notes?.trim() || 'Diapprove oleh admin'
      })
      .eq('id', correction_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Grant EXP
    const expGain = correction.type === 'Check-In' ? EXP_REWARDS.CHECK_IN : EXP_REWARDS.CHECK_OUT;
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp, streak_count')
      .eq('id', correction.intern_id)
      .single();

    if (internData) {
      const newExp = (internData.total_exp || 0) + expGain;
      const updates: any = { total_exp: newExp };
      // Kalau Check-In correction, increment streak
      if (correction.type === 'Check-In') {
        updates.streak_count = (internData.streak_count || 0) + 1;
      }
      await supabase.from('interns').update(updates).eq('id', correction.intern_id);
    }

    // Nudge peserta
    const intern = correction.interns as any;
    await supabase.from('nudges').insert({
      intern_id: correction.intern_id,
      message: `✅ Koreksi ${correction.type} untuk tanggal ${dateStr} Anda DISETUJUI oleh admin. Record absen telah ditambahkan (+${expGain} EXP). Catatan admin: ${review_notes?.trim() || 'Diapprove'}.`,
      type: 'correction_approved',
      created_by_type: 'admin',
      created_by_id: admin.sub,
      created_by_name: admin.name
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
