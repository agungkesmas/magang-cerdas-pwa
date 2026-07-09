// ============================================================
// /api/bkk/notifications — BKK teacher: list & mark-as-read
//
// GET   → list all notifications (newest first)
// PATCH → mark one (by id) or all as read
//
// Akses: BKK teacher (only their own notifications)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken } from '@/lib/auth';

export async function GET() {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('bkk_notifications')
      .select('id, type, title, message, related_request_id, is_read, created_at')
      .eq('bkk_teacher_id', teacher.teacher_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const unread_count = (data || []).filter((n: any) => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: data || [],
      unread_count
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const teacher = await getBKKToken();
    if (!teacher) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const supabase = createServerClient();

    if (body.mark_all === true) {
      // Mark all as read
      const { error } = await supabase
        .from('bkk_notifications')
        .update({ is_read: true })
        .eq('bkk_teacher_id', teacher.teacher_id)
        .eq('is_read', false);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, marked: 'all' });
    }

    if (body.id) {
      // Mark one as read
      const { error } = await supabase
        .from('bkk_notifications')
        .update({ is_read: true })
        .eq('id', body.id)
        .eq('bkk_teacher_id', teacher.teacher_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, marked: body.id });
    }

    return NextResponse.json({ error: 'Body harus berisi { id } atau { mark_all: true }' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
