// ============================================================
// /api/interns/update — Update intern record (admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, generateInternCredentials, hashPassword } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, action, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Intern ID required' }, { status: 400 });
    }

    const supabase = createServerClient();

    if (action === 'regenerate_password') {
      // Fetch current intern
      const { data: intern } = await supabase
        .from('interns')
        .select('name')
        .eq('id', id)
        .single();
      if (!intern) {
        return NextResponse.json({ error: 'Intern not found' }, { status: 404 });
      }
      const { password } = generateInternCredentials(intern.name);
      const hash = await hashPassword(password);
      const { error } = await supabase
        .from('interns')
        .update({ password_hash: hash, raw_password: password })
        .eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, raw_password: password });
    }

    if (action === 'toggle_active') {
      const { data: intern } = await supabase
        .from('interns')
        .select('is_active')
        .eq('id', id)
        .single();
      if (!intern) {
        return NextResponse.json({ error: 'Intern not found' }, { status: 404 });
      }
      const { error } = await supabase
        .from('interns')
        .update({ is_active: !intern.is_active })
        .eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, is_active: !intern.is_active });
    }

    // Default: update fields
    const allowedFields = ['name', 'school_origin', 'major', 'department', 'start_date', 'end_date'];
    const cleanUpdates: Record<string, unknown> = {};
    for (const f of allowedFields) {
      if (updates[f] !== undefined) cleanUpdates[f] = updates[f];
    }
    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { error } = await supabase.from('interns').update(cleanUpdates).eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
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
      return NextResponse.json({ error: 'Intern ID required' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { error } = await supabase.from('interns').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
