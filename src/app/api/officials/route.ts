// ============================================================
// /api/officials — CRUD for officials (Kepala Cabang)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('officials')
      .select('*')
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, officials: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, nip, position, set_active } = await req.json();
    if (!name) {
      return NextResponse.json({ error: 'name wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // If set_active, deactivate all others first
    if (set_active) {
      await supabase.from('officials').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { data, error } = await supabase
      .from('officials')
      .insert({
        name: name.trim(),
        nip: nip?.trim() || '',
        position: position?.trim() || 'Kepala Kantor Cabang',
        is_active: !!set_active
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, official: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, nip, position, set_active } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    if (set_active) {
      await supabase.from('officials').update({ is_active: false }).neq('id', id);
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (nip !== undefined) updates.nip = nip.trim();
    if (position !== undefined) updates.position = position.trim();
    if (set_active !== undefined) updates.is_active = !!set_active;

    const { error } = await supabase.from('officials').update(updates).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('officials').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
