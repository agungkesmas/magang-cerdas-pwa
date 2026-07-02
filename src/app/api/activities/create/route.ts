// ============================================================
// /api/activities/create — Admin assign aktivitas ke peserta
// Mode: per-intern (intern_id) ATAU per-departemen (department)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { Department } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, intern_id, department, due_date } = await req.json();

    // Validation
    if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });
    if (!intern_id && !department) {
      return NextResponse.json({ error: 'Pilih peserta ATAU departemen' }, { status: 400 });
    }
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
    }

    // Parse due_date (optional)
    let parsedDueDate: string | null = null;
    if (due_date) {
      const d = new Date(due_date);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Format deadline tidak valid' }, { status: 400 });
      }
      parsedDueDate = d.toISOString();
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('activities')
      .insert({
        title: title.trim(),
        description: description.trim(),
        intern_id: intern_id || null,
        department: department || null,
        due_date: parsedDueDate,
        is_active: true,
        created_by: admin.sub
      })
      .select()
      .single();

    if (error) {
      console.error('[activities/create] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activity: data });
  } catch (e: any) {
    console.error('[activities/create] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
