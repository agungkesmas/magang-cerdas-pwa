// ============================================================
// /api/pembina/approve-attendance — Approve/reject pending attendance
//
// Body: { attendance_id, action: 'approve' | 'reject', notes?: string }
//
// Logic:
// 1. Verify pembina adalah anggota grup yang sama dengan peserta
// 2. Update attendance: approval_status, approved_by, approved_at, approval_notes
// 3. Kalau approve → grant EXP ke peserta + nudge notifikasi
// 4. Kalau reject → no EXP
//
// Untuk Check-In approve: juga update streak_count (+1)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getPembinaToken } from '@/lib/auth';
import { EXP_REWARDS } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const pembina = await getPembinaToken();
    if (!pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { attendance_id, action, notes } = await req.json();

    // Validasi
    if (!attendance_id) {
      return NextResponse.json({ error: 'attendance_id wajib diisi' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Action harus approve atau reject' }, { status: 400 });
    }

    const supabase = createServerClient();

    // 1. Fetch attendance + intern info
    const { data: att, error: attErr } = await supabase
      .from('attendance')
      .select('id, intern_id, type, approval_status, is_holiday_checkin, timestamp')
      .eq('id', attendance_id)
      .maybeSingle();

    if (attErr || !att) {
      return NextResponse.json({ error: 'Attendance tidak ditemukan' }, { status: 404 });
    }

    if (att.approval_status !== 'pending') {
      return NextResponse.json(
        { error: `Attendance sudah ${att.approval_status}, tidak bisa diubah lagi` },
        { status: 400 }
      );
    }

    // 2. Verify pembina anggota grup yang sama dengan peserta
    const { data: pembinaGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'pembina')
      .eq('user_id', pembina.pembina_id);

    const { data: internGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_type', 'peserta')
      .eq('user_id', att.intern_id);

    const pembinaGroupIds = (pembinaGroups || []).map((g: any) => g.group_id);
    const internGroupIds = (internGroups || []).map((g: any) => g.group_id);
    const hasOverlap = pembinaGroupIds.some((id: string) => internGroupIds.includes(id));

    if (!hasOverlap) {
      return NextResponse.json(
        { error: 'Peserta ini tidak ada di grup yang Anda bimbing' },
        { status: 403 }
      );
    }

    // 3. Update attendance
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateErr } = await supabase
      .from('attendance')
      .update({
        approval_status: newStatus,
        approved_by: pembina.pembina_id,
        approved_at: new Date().toISOString(),
        approval_notes: notes?.trim() || null
      })
      .eq('id', attendance_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 4. Kalau approve → grant EXP + update streak (untuk Check-In)
    if (action === 'approve') {
      const expGain = att.type === 'Check-In' ? EXP_REWARDS.CHECK_IN : EXP_REWARDS.CHECK_OUT;

      const { data: internData } = await supabase
        .from('interns')
        .select('total_exp, streak_count, name')
        .eq('id', att.intern_id)
        .single();

      if (internData) {
        const newExp = (internData.total_exp || 0) + expGain;
        const updateData: any = { total_exp: newExp };

        // Update streak hanya untuk Check-In approve
        if (att.type === 'Check-In') {
          updateData.streak_count = (internData.streak_count || 0) + 1;
        }

        await supabase
          .from('interns')
          .update(updateData)
          .eq('id', att.intern_id);
      }

      // 5. Kirim nudge ke peserta
      const tanggal = new Date(att.timestamp).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const typeLabel = att.type === 'Check-In' ? 'Check-In' : 'Check-Out';
      const noteText = notes?.trim() ? ` Catatan pembina: "${notes.trim()}"` : '';

      await supabase.from('nudges').insert({
        intern_id: att.intern_id,
        message: `✅ ${typeLabel} Anda di ${tanggal} disetujui pembina. +${expGain} EXP diberikan.${noteText}`,
        type: 'attendance_approved'
      });

      return NextResponse.json({
        success: true,
        action: 'approved',
        exp_granted: expGain,
        message: `Check-in disetujui. +${expGain} EXP diberikan ke peserta.`
      });
    } else {
      // Reject → kirim nudge ke peserta
      const tanggal = new Date(att.timestamp).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const typeLabel = att.type === 'Check-In' ? 'Check-In' : 'Check-Out';
      const noteText = notes?.trim() ? ` Alasan: "${notes.trim()}"` : '';

      await supabase.from('nudges').insert({
        intern_id: att.intern_id,
        message: `❌ ${typeLabel} Anda di ${tanggal} ditolak pembina. EXP tidak diberikan.${noteText}`,
        type: 'attendance_rejected'
      });

      return NextResponse.json({
        success: true,
        action: 'rejected',
        exp_granted: 0,
        message: 'Check-in ditolak. EXP tidak diberikan.'
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
