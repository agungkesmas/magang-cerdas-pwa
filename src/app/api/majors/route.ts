// ============================================================
// /api/majors — CRUD Master Jurusan per Institusi
// GET: list majors (filter by school_id optional)
// POST/PUT/DELETE: admin only
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

// Public: list majors (with optional school_id filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('school_id');

    const supabase = createServerClient();
    let query = supabase.from('majors').select('*').order('name', { ascending: true });
    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, majors: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Admin: create major
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { school_id, name, code } = await req.json();
    if (!school_id || !name?.trim()) {
      return NextResponse.json({ error: 'school_id dan name wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('majors')
      .insert({
        school_id,
        name: name.trim(),
        code: code?.trim() || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Jurusan dengan nama ini sudah ada di sekolah ini' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, major: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Admin: update major
export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, code } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (code !== undefined) updates.code = code?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field untuk diupdate' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('majors').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Admin: delete major
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('majors').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
