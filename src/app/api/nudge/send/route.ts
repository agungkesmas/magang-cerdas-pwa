// ============================================================
// /api/nudge/send — Admin/BKK sends nudge to intern
// Admin: bisa nudge siapa saja
// BKK: hanya bisa nudge peserta dari sekolah yang dibimbing
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getBKKToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const bkk = await getBKKToken();
    if (!admin && !bkk) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { intern_id, message, type } = await req.json();
    if (!intern_id || !message) {
      return NextResponse.json({ error: 'intern_id dan message wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // BKK: verify intern is from their school
    if (bkk && !admin) {
      const { data: intern } = await supabase
        .from('interns')
        .select('school_origin')
        .eq('id', intern_id)
        .single();
      if (!intern || !bkk.schools.includes(intern.school_origin)) {
        return NextResponse.json({ error: 'Anda tidak bisa mengirim nudge ke peserta ini' }, { status: 403 });
      }
    }

    const senderName = admin?.name || bkk?.name || 'Sistem';
    const senderType = admin ? 'admin' : 'bkk';
    const senderId = admin?.sub || bkk?.teacher_id;

    const { data, error } = await supabase
      .from('nudges')
      .insert({
        intern_id,
        message,
        type: type || 'check_in_reminder',
        created_by_type: senderType,
        created_by_id: senderId,
        created_by_name: senderName
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, nudge: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
