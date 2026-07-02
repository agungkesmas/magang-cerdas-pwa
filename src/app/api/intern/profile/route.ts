// ============================================================
// /api/intern/profile — Intern get + update own profile
// GET: return profile (no sensitive fields)
// PUT: update phone + photo_url only (name, major, school, dept = READ-ONLY)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';

export async function GET() {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('interns')
      .select('id, name, username, major, major_id, department, school_origin, start_date, end_date, total_exp, streak_count, phone, photo_url, is_active, logbook_enabled, created_at')
      .eq('id', intern.intern_id)
      .single();
    if (error || !data) return NextResponse.json({ error: 'Profile tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ success: true, profile: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phone, photo_url } = await req.json();

    // HANYA phone + photo_url yang boleh diupdate (strict whitelist)
    const updates: Record<string, unknown> = {};
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (photo_url !== undefined) updates.photo_url = photo_url || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field valid untuk diupdate. Hanya foto profil dan nomor telepon yang bisa diubah.' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('interns').update(updates).eq('id', intern.intern_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
