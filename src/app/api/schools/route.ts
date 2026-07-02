// ============================================================
// /api/schools — CRUD Schools (admin only for write, public read)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

// Public: list all schools (for autocomplete)
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('name', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, schools: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Admin: create new school
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, address, contact_person, contact_phone } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nama sekolah wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name: name.trim(),
        address: address?.trim() || null,
        contact_person: contact_person?.trim() || null,
        contact_phone: contact_phone?.trim() || null
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Nama sekolah sudah ada' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, school: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Admin: update school
export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, address, contact_person, contact_phone } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (address !== undefined) updates.address = address?.trim() || null;
    if (contact_person !== undefined) updates.contact_person = contact_person?.trim() || null;
    if (contact_phone !== undefined) updates.contact_phone = contact_phone?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field untuk diupdate' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('schools').update(updates).eq('id', id);
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Nama sekolah sudah dipakai' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Admin: delete school
export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const supabase = createServerClient();
    const { error } = await supabase.from('schools').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
