// ============================================================
// /api/pembina/update — Admin: edit pembina (name, department, phone, is_active)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang'];

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, email, department, phone, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name.trim();
    if (email !== undefined) updateFields.email = email.toLowerCase().trim();
    if (department !== undefined) {
      if (!VALID_DEPARTMENTS.includes(department)) {
        return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
      }
      updateFields.department = department;
    }
    if (phone !== undefined) updateFields.phone = phone?.trim() || null;
    if (is_active !== undefined) updateFields.is_active = !!is_active;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('pembina_magang')
      .update(updateFields)
      .eq('id', id)
      .select('id, pembina_id, email, name, department, phone, is_active')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, pembina: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
