// ============================================================
// /api/attendance/correction/submit — Peserta ajukan koreksi absen
//
// POST { correction_date, type, reason, promise_not_repeat }
//
// Aturan:
// - Hanya untuk tanggal MASA LALU (≤ kemarin, tidak bisa hari ini/masa depan)
// - Hanya untuk tanggal dalam periode magang aktif
// - Hanya untuk tanggal yang BELUM ada record absen tipe tersebut
// - Maksimal 5 koreksi per peserta per bulan (anti-abuse)
// - promise_not_repeat WAJIB true (checkbox "Saya berjanji tidak mengulangi")
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { getWIBToday } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { correction_date, type, reason, promise_not_repeat } = await req.json();

    // Validasi input
    if (!correction_date || !type || !reason) {
      return NextResponse.json({ error: 'Field wajib: correction_date, type, reason' }, { status: 400 });
    }
    if (!['Check-In', 'Check-Out'].includes(type)) {
      return NextResponse.json({ error: 'Type harus Check-In atau Check-Out' }, { status: 400 });
    }
    if (!promise_not_repeat) {
      return NextResponse.json({ error: 'Anda wajib mencentang "Saya berjanji tidak akan mengulangi"' }, { status: 400 });
    }
    if (reason.trim().length < 10) {
      return NextResponse.json({ error: 'Alasan minimal 10 karakter' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get intern profile untuk cek periode magang
    const { data: internData } = await supabase
      .from('interns')
      .select('start_date, end_date, is_active')
      .eq('id', intern.intern_id)
      .single();
    if (!internData || !internData.is_active) {
      return NextResponse.json({ error: 'Akun magang tidak aktif' }, { status: 400 });
    }

    // Validasi tanggal: harus masa lalu (≤ kemarin WIB)
    const todayWIB = getWIBToday();
    if (correction_date >= todayWIB) {
      return NextResponse.json({ error: 'Koreksi hanya untuk tanggal masa lalu (kemarin atau sebelumnya)' }, { status: 400 });
    }

    // Validasi tanggal: harus dalam periode magang
    if (internData.start_date && correction_date < internData.start_date) {
      return NextResponse.json({ error: 'Tanggal di luar periode magang Anda (sebelum tanggal mulai)' }, { status: 400 });
    }
    if (internData.end_date && correction_date > internData.end_date) {
      return NextResponse.json({ error: 'Tanggal di luar periode magang Anda (setelah tanggal selesai)' }, { status: 400 });
    }

    // Cek apakah sudah ada record absen untuk tanggal + tipe tersebut
    const dateStart = new Date(`${correction_date}T00:00:00+07:00`).toISOString();
    const dateEnd = new Date(`${correction_date}T23:59:59.999+07:00`).toISOString();
    const { data: existingAtt } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', type)
      .gte('timestamp', dateStart)
      .lte('timestamp', dateEnd)
      .maybeSingle();

    if (existingAtt) {
      return NextResponse.json({
        error: `Anda sudah punya record ${type} pada tanggal ${correction_date}. Tidak bisa ajukan koreksi untuk tanggal yang sudah ada absennya.`
      }, { status: 400 });
    }

    // Cek apakah sudah ada koreksi pending untuk tanggal + tipe ini
    const { data: existingCorrection } = await supabase
      .from('attendance_corrections')
      .select('id, status')
      .eq('intern_id', intern.intern_id)
      .eq('correction_date', correction_date)
      .eq('type', type)
      .maybeSingle();

    if (existingCorrection) {
      return NextResponse.json({
        error: `Anda sudah mengajukan koreksi ${type} untuk tanggal ${correction_date}. Status: ${existingCorrection.status}.`
      }, { status: 400 });
    }

    // Anti-abuse: maksimal 5 koreksi per bulan
    const monthStart = correction_date.substring(0, 8) + '01'; // YYYY-MM-01
    const monthEnd = correction_date.substring(0, 8) + '31';   // YYYY-MM-31
    const { count: monthCount } = await supabase
      .from('attendance_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('intern_id', intern.intern_id)
      .gte('correction_date', monthStart)
      .lte('correction_date', monthEnd)
      .neq('status', 'rejected'); // yang rejected tidak dihitung

    if ((monthCount || 0) >= 5) {
      return NextResponse.json({
        error: 'Anda sudah mengajukan 5 koreksi bulan ini (batas maksimal). Hubungi admin kalau ada keperluan mendesak.'
      }, { status: 429 });
    }

    // Insert koreksi
    const { data: correction, error } = await supabase
      .from('attendance_corrections')
      .insert({
        intern_id: intern.intern_id,
        correction_date,
        type,
        reason: reason.trim(),
        promise_not_repeat: true,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      correction,
      message: `Koreksi ${type} untuk tanggal ${correction_date} berhasil diajukan. Menunggu persetujuan admin. Anda akan mendapat notifikasi setelah diproses.`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
