// ============================================================
// /api/admin/attendance/delete — Hapus record attendance peserta
//
// Use case:
//   - Admin butuh hapus record check-in/check-out (mis. karena bug testing,
//     validasi keliru, atau record ganda)
//   - EXP yang sudah diberikan dari record tsb juga di-debit balik dari
//     total_exp intern
//
// Effect:
//   - Row di tabel `attendance` dihapus
//   - total_exp intern di-debit: -EXP_REWARDS.CHECK_IN (5) atau -EXP_REWARDS.CHECK_OUT (10)
//     HANYA jika approval_status='approved' (kalau pending, EXP belum diberikan)
//
// Akses: Admin only
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

    const { attendance_id, reason } = await req.json();
    if (!attendance_id) {
      return NextResponse.json({ error: 'attendance_id wajib diisi' }, { status: 400 });
    }
    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { error: 'Alasan wajib diisi minimal 5 karakter (untuk audit trail).' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // 1. Fetch record
    const { data: att, error: aErr } = await supabase
      .from('attendance')
      .select('id, intern_id, type, approval_status, is_holiday_checkin')
      .eq('id', attendance_id)
      .maybeSingle();

    if (aErr || !att) {
      return NextResponse.json({ error: 'Record attendance tidak ditemukan' }, { status: 404 });
    }

    // 2. Hitung EXP yang harus di-debit (hanya jika approved & bukan holiday)
    let expToDebit = 0;
    if (att.approval_status === 'approved' && !att.is_holiday_checkin) {
      if (att.type === 'Check-In') expToDebit = EXP_REWARDS.CHECK_IN;
      else if (att.type === 'Check-Out') expToDebit = EXP_REWARDS.CHECK_OUT;
    }

    // 3. Hapus record
    const { error: dErr } = await supabase
      .from('attendance')
      .delete()
      .eq('id', attendance_id);

    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    // 4. Debit EXP dari intern
    if (expToDebit > 0) {
      const { data: internData } = await supabase
        .from('interns')
        .select('total_exp')
        .eq('id', att.intern_id)
        .single();
      if (internData) {
        const newExp = Math.max(0, (internData.total_exp || 0) - expToDebit);
        await supabase
          .from('interns')
          .update({ total_exp: newExp })
          .eq('id', att.intern_id);
      }
    }

    // 5. Log ke audit trail (opsional — pakai tabel admin_activity_logs kalau ada)
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: admin.admin_id,
          action: 'delete_attendance',
          target_type: 'attendance',
          target_id: attendance_id,
          target_intern_id: att.intern_id,
          reason: reason.trim(),
          metadata: { type: att.type, exp_debited: expToDebit }
        });
    } catch {
      // Tabel admin_activity_logs belum ada — skip, bukan critical
    }

    return NextResponse.json({
      success: true,
      message: `Record ${att.type} berhasil dihapus. ${expToDebit > 0 ? `EXP intern di-debit -${expToDebit}.` : 'Tidak ada EXP yang di-debit (record pending/holiday).'}`,
      deleted: {
        attendance_id,
        type: att.type,
        intern_id: att.intern_id,
        exp_debited: expToDebit
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
