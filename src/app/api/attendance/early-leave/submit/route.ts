// ============================================================
// /api/attendance/early-leave/submit — Peserta ajukan izin pulang cepat
// Setelah check-out sebelum 17:00, peserta bisa ajukan alasan
//
// POST { attendance_id, reason }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attendance_id, reason } = await req.json();
    if (!attendance_id) {
      return NextResponse.json({ error: 'attendance_id wajib diisi' }, { status: 400 });
    }
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json({ error: 'Alasan minimal 10 karakter' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Verify attendance record milik peserta ini & is_early=true
    const { data: att, error: attErr } = await supabase
      .from('attendance')
      .select('id, type, is_early, timestamp, approval_status')
      .eq('id', attendance_id)
      .eq('intern_id', intern.intern_id)
      .single();

    if (attErr || !att) {
      return NextResponse.json({ error: 'Record absen tidak ditemukan' }, { status: 404 });
    }
    if (att.type !== 'Check-Out') {
      return NextResponse.json({ error: 'Izin pulang cepat hanya untuk record Check-Out' }, { status: 400 });
    }
    if (!att.is_early) {
      return NextResponse.json({ error: 'Record ini tidak terdeteksi pulang awal — tidak perlu izin' }, { status: 400 });
    }

    // Cek apakah sudah ada izin untuk tanggal ini
    const attDate = new Date(att.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const { data: existing } = await supabase
      .from('early_leave_requests')
      .select('id, status')
      .eq('intern_id', intern.intern_id)
      .eq('request_date', attDate)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        error: `Anda sudah mengajukan izin pulang cepat untuk tanggal ${attDate}. Status: ${existing.status}.`
      }, { status: 400 });
    }

    // Insert request
    const { data: request, error } = await supabase
      .from('early_leave_requests')
      .insert({
        intern_id: intern.intern_id,
        attendance_id: attendance_id,
        request_date: attDate,
        actual_checkout_time: att.timestamp,
        reason: reason.trim(),
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      request,
      message: `Izin pulang cepat untuk tanggal ${attDate} berhasil diajukan. Menunggu persetujuan admin.`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
