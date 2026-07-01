// ============================================================
// /api/tasks/create — Admin creates a base task
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { Department } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, department, base_description, target_count } = await req.json();
    if (!title || !department || !base_description) {
      return NextResponse.json(
        { error: 'Field wajib: title, department, base_description' },
        { status: 400 }
      );
    }
    if (!VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('Tasks')
      .insert({
        title: title.trim(),
        department,
        base_description: base_description.trim(),
        target_count: Math.max(1, parseInt(target_count) || 1),
        is_active: true
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, task: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
