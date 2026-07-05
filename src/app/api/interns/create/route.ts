// ============================================================
// /api/interns/create — Admin creates a new intern
// Auto-generates username + password, returns them for sharing
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { generateInternCredentials, hashPassword, getAdminToken } from '@/lib/auth';
import { syncInternToSystemGroups } from '@/lib/system-groups';
import { Intern, Department } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin login required' }, { status: 401 });
    }

    const body = await req.json();
    const { name, school_origin, major, major_id, department, start_date, end_date, email, whatsapp } = body;

    // Validation
    if (!name || !department || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Field wajib: name, department, start_date, end_date' },
        { status: 400 }
      );
    }
    if (!major && !major_id) {
      return NextResponse.json(
        { error: 'Jurusan wajib diisi (major_id atau major)' },
        { status: 400 }
      );
    }
    if (!VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json(
        { error: `Department harus salah satu: ${VALID_DEPARTMENTS.join(', ')}` },
        { status: 400 }
      );
    }
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Format tanggal tidak valid' }, { status: 400 });
    }
    if (endDate <= startDate) {
      return NextResponse.json({ error: 'end_date harus setelah start_date' }, { status: 400 });
    }

    // Jika major_id diberikan, fetch major name dari tabel majors
    let majorName = major;
    let majorIdValue: string | null = null;
    if (major_id) {
      const supabase = createServerClient();
      const { data: majorData, error: mErr } = await supabase
        .from('majors')
        .select('id, name')
        .eq('id', major_id)
        .single();
      if (mErr || !majorData) {
        return NextResponse.json({ error: 'Jurusan tidak ditemukan' }, { status: 400 });
      }
      majorName = majorData.name;
      majorIdValue = majorData.id;
    }

    // Generate credentials
    const { username, password } = generateInternCredentials(name);
    const passwordHash = await hashPassword(password);

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('interns')
      .insert({
        name: name.trim(),
        school_origin: school_origin?.trim() || null,
        major: majorName?.trim() || major.trim(),
        major_id: majorIdValue,
        email: email?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        department,
        start_date,
        end_date,
        username,
        password_hash: passwordHash,
        raw_password: password,
        total_exp: 0,
        streak_count: 0,
        is_active: true,
        logbook_enabled: true,
        survival_kit_progress: {},
        certificate_unlocked: false
      })
      .select()
      .single();

    if (error) {
      console.error('[interns/create] DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const intern = data as Intern;

    // Auto-sync to system groups
    await syncInternToSystemGroups(supabase, intern.id, intern.department, true);

    return NextResponse.json({
      success: true,
      intern: {
        id: intern.id,
        name: intern.name,
        username: intern.username,
        raw_password: intern.raw_password,
        major: intern.major,
        department: intern.department,
        school_origin: intern.school_origin,
        start_date: intern.start_date,
        end_date: intern.end_date
      },
      credentials: {
        username: intern.username,
        password: intern.raw_password,
        shareText: `Hai ${intern.name}!\n\nKredensial login MAGANG-CERDAS Anda:\nUsername: ${intern.username}\nPassword: ${intern.raw_password}\n\nLogin di: ${req.nextUrl.origin}/intern/login\n\nSelamat magang!`
      }
    });
  } catch (e: any) {
    console.error('[interns/create] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
