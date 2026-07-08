// ============================================================
// /api/attendance/flag-suspicious — Admin/Pembina tandai foto
// check-in mencurigakan (beda orang, foto benda, screenshot).
//
// POST { attendance_id, reason }
//   - Set is_suspicious=true
//   - Set suspicious_flagged_by (admin_id)
//   - Set suspicious_reason
//   - Auto-nudge peserta dengan pesan peringatan
//
// DELETE { attendance_id }
//   - Clear flag (un-suspicious)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized — admin atau pembina only' }, { status: 401 });
    }

    const { attendance_id, reason } = await req.json();
    if (!attendance_id) {
      return NextResponse.json({ error: 'attendance_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get attendance record + intern info
    const { data: att, error: attErr } = await supabase
      .from('attendance')
      .select(`
        id,
        intern_id,
        type,
        timestamp,
        photo_url,
        distance_meters,
        interns!inner(name, username, department)
      `)
      .eq('id', attendance_id)
      .single();

    if (attErr || !att) {
      return NextResponse.json({ error: 'Attendance record tidak ditemukan' }, { status: 404 });
    }

    // Update flag
    const flaggerId = admin?.sub || pembina?.pembina_id;
    const flaggerName = admin?.name || pembina?.name || 'Pembina';
    const { error: updateErr } = await supabase
      .from('attendance')
      .update({
        is_suspicious: true,
        suspicious_flagged_by: admin?.sub || null,
        suspicious_flagged_at: new Date().toISOString(),
        suspicious_reason: reason?.trim() || 'Foto mencurigakan (ditandai manual)'
      })
      .eq('id', attendance_id);

    if (updateErr) {
      return NextResponse.json({ error: 'Update gagal: ' + updateErr.message }, { status: 500 });
    }

    // Auto-nudge peserta
    const intern = att.interns as any;
    const ts = new Date(att.timestamp).toLocaleString('id-ID', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    const nudgeMessage = `⚠️ Foto ${att.type} Anda pada ${ts} ditandai MENCURIGAKAN oleh ${flaggerName}. Alasan: ${reason?.trim() || 'perlu verifikasi'}. Mohon segera hubungi pembina/admin untuk klarifikasi. Jika kedapatan memalsukan absensi, sanksi akan diberikan sesuai aturan magang BPJS Ketenagakerjaan.`;

    await supabase.from('nudges').insert({
      intern_id: att.intern_id,
      message: nudgeMessage,
      type: 'suspicious_attendance',
      created_by_type: admin ? 'admin' : 'pembina',
      created_by_id: flaggerId,
      created_by_name: flaggerName
    });

    return NextResponse.json({
      success: true,
      message: `Foto ${att.type} ${intern.name} ditandai mencurigakan. Nudge otomatis terkirim ke peserta.`,
      attendance: {
        id: att.id,
        intern_name: intern.name,
        type: att.type,
        timestamp: att.timestamp
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const attendance_id = searchParams.get('attendance_id');
    if (!attendance_id) {
      return NextResponse.json({ error: 'attendance_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase
      .from('attendance')
      .update({
        is_suspicious: false,
        suspicious_flagged_by: null,
        suspicious_flagged_at: null,
        suspicious_reason: null
      })
      .eq('id', attendance_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Flag mencurigakan dihapus'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
