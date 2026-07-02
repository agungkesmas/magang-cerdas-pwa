// ============================================================
// /api/activities/create — Admin assign aktivitas ke peserta
// Mode 1: per-intern (intern_id) ATAU per-departemen (department)
// Mode 2: SEKALI selesai (is_recurring=false) ATAU HARIAN berulang (is_recurring=true)
//         Jika recurring: wajib start_date & end_date
//         Intern bisa complete 1x per hari, dapat EXP per hari
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

    const {
      title,
      description,
      intern_id,
      department,
      due_date,
      // New recurring fields
      is_recurring = false,
      start_date,
      end_date,
      skip_weekend = true,
      daily_deadline_hour = 17
    } = await req.json();

    // Validation
    if (!title?.trim()) return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: 'Deskripsi wajib diisi' }, { status: 400 });
    if (!intern_id && !department) {
      return NextResponse.json({ error: 'Pilih peserta ATAU departemen' }, { status: 400 });
    }
    if (department && !VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Departemen tidak valid' }, { status: 400 });
    }

    // Parse due_date (optional, untuk mode non-recurring)
    let parsedDueDate: string | null = null;
    if (due_date) {
      const d = new Date(due_date);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Format deadline tidak valid' }, { status: 400 });
      }
      parsedDueDate = d.toISOString();
    }

    // Validation untuk recurring mode
    let parsedStartDate: string | null = null;
    let parsedEndDate: string | null = null;
    if (is_recurring) {
      if (!start_date || !end_date) {
        return NextResponse.json({ error: 'Mode recurring wajib set start_date & end_date' }, { status: 400 });
      }
      const sd = new Date(start_date);
      const ed = new Date(end_date);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) {
        return NextResponse.json({ error: 'Format tanggal range tidak valid' }, { status: 400 });
      }
      if (ed < sd) {
        return NextResponse.json({ error: 'Tanggal selesai tidak boleh sebelum tanggal mulai' }, { status: 400 });
      }
      parsedStartDate = sd.toISOString().split('T')[0];
      parsedEndDate = ed.toISOString().split('T')[0];
    }

    // Validate daily_deadline_hour
    const deadlineHour = Number(daily_deadline_hour);
    if (isNaN(deadlineHour) || deadlineHour < 0 || deadlineHour > 23) {
      return NextResponse.json({ error: 'Daily deadline hour tidak valid (0-23)' }, { status: 400 });
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
        created_by: admin.sub,
        // New fields
        is_recurring: !!is_recurring,
        start_date: parsedStartDate,
        end_date: parsedEndDate,
        skip_weekend: !!skip_weekend,
        daily_deadline_hour: deadlineHour
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
