// ============================================================
// /api/bkk-teachers/update — Update BKK teacher (admin)
// Supports: edit profile, toggle active, update school links
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, email, phone, school_ids, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const supabase = createServerClient();

    // If updating email, check uniqueness
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
      }
      const { data: existing } = await supabase
        .from('bkk_teachers')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .neq('id', id)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({ error: 'Email sudah dipakai teacher lain' }, { status: 400 });
      }
    }

    // Update profile fields
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.toLowerCase().trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (is_active !== undefined) updates.is_active = !!is_active;

    if (Object.keys(updates).length > 0) {
      const { error: uErr } = await supabase.from('bkk_teachers').update(updates).eq('id', id);
      if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    // Update school links if provided
    if (school_ids !== undefined && Array.isArray(school_ids)) {
      if (school_ids.length === 0) {
        return NextResponse.json({ error: 'Pilih minimal 1 sekolah' }, { status: 400 });
      }

      // Verify all school_ids exist
      const { data: validSchools } = await supabase
        .from('schools')
        .select('id')
        .in('id', school_ids);
      if (!validSchools || validSchools.length !== school_ids.length) {
        return NextResponse.json({ error: 'Satu atau lebih sekolah tidak valid' }, { status: 400 });
      }

      // Delete existing links
      const { error: dErr } = await supabase
        .from('bkk_teacher_schools')
        .delete()
        .eq('bkk_teacher_id', id);
      if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

      // Insert new links
      const junctionRows = school_ids.map((sid: string) => ({
        bkk_teacher_id: id,
        school_id: sid
      }));
      const { error: iErr } = await supabase.from('bkk_teacher_schools').insert(junctionRows);
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const supabase = createServerClient();
    // Junction table ON DELETE CASCADE will auto-clean
    const { error } = await supabase.from('bkk_teachers').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
