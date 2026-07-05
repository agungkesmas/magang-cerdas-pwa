// ============================================================
// /api/pembina/update — Edit pembina
// Admin: bisa edit semua field (name, email, department, phone, is_active)
// Pembina: bisa edit profil sendiri (name, phone saja — bukan department/email)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, getPembinaToken } from '@/lib/auth';
import { syncPembinaToSystemGroups } from '@/lib/system-groups';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan', 'Lintas Bidang'];

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    const pembina = await getPembinaToken();
    if (!admin && !pembina) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id, name, email, department, phone, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID wajib diisi' }, { status: 400 });

    // Permission check: pembina hanya bisa edit profil sendiri
    if (pembina && !admin) {
      if (id !== pembina.pembina_id) {
        return NextResponse.json({ error: 'Anda hanya bisa edit profil sendiri' }, { status: 403 });
      }
    }

    const updateFields: any = {};

    if (admin) {
      // Admin bisa edit semua field
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
    } else {
      // Pembina hanya bisa edit name & phone
      if (name !== undefined) updateFields.name = name.trim();
      if (phone !== undefined) updateFields.phone = phone?.trim() || null;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field untuk diupdate' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('pembina_magang')
      .update(updateFields)
      .eq('id', id)
      .select('id, pembina_id, email, name, department, phone, is_active')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Sync system groups if department or is_active changed (admin only)
    if (admin && (updateFields.is_active !== undefined || updateFields.department !== undefined)) {
      await syncPembinaToSystemGroups(supabase, data.id, data.department, data.is_active);
    }

    return NextResponse.json({ success: true, pembina: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
