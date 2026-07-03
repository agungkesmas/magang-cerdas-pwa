// ============================================================
// /api/bkk-teachers/create — Admin creates new BKK teacher
// Auto-generates BKK-XXXX ID + password (similar to pembina)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, hashPassword } from '@/lib/auth';

function generateBKKPassword(): string {
  const symbols = '!@#$%&*';
  const alphanum = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const year = new Date().getFullYear();
  const symbol = symbols[Math.floor(Math.random() * symbols.length)];
  let tail = '';
  for (let i = 0; i < 4; i++) {
    tail += alphanum[Math.floor(Math.random() * alphanum.length)];
  }
  return `Bkk${year}${symbol}${tail}`;
}

// Generate next bkk_id (BKK-0001, BKK-0002, ...)
async function generateBKKId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('bkk_teachers')
    .select('bkk_id')
    .not('bkk_id', 'is', null)
    .order('bkk_id', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return 'BKK-0001';
  const last = data[0].bkk_id;
  const match = last.match(/^BKK-(\d+)$/);
  if (!match) return 'BKK-0001';
  const next = parseInt(match[1], 10) + 1;
  return `BKK-${String(next).padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, email, phone, school_ids, custom_password } = await req.json();

    // Validation
    if (!name || !name.trim()) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });
    if (!email || !email.trim()) return NextResponse.json({ error: 'Email wajib diisi' }, { status: 400 });
    if (!school_ids || !Array.isArray(school_ids) || school_ids.length === 0) {
      return NextResponse.json({ error: 'Pilih minimal 1 sekolah' }, { status: 400 });
    }

    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Format email tidak valid' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('bkk_teachers')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Verify all school_ids exist
    const { data: validSchools } = await supabase
      .from('schools')
      .select('id, name')
      .in('id', school_ids);
    if (!validSchools || validSchools.length !== school_ids.length) {
      return NextResponse.json({ error: 'Satu atau lebih sekolah tidak valid' }, { status: 400 });
    }

    // Generate password + BKK ID
    const password = custom_password?.trim() || generateBKKPassword();
    const passwordHash = await hashPassword(password);
    const bkkId = await generateBKKId(supabase);

    // Insert BKK teacher
    const { data: teacher, error: tErr } = await supabase
      .from('bkk_teachers')
      .insert({
        bkk_id: bkkId,
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        raw_password: password,
        name: name.trim(),
        phone: phone?.trim() || null,
        is_active: true
      })
      .select()
      .single();

    if (tErr) {
      console.error('[bkk-teachers/create] DB error:', tErr);
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    // Link to schools (junction table)
    const junctionRows = school_ids.map((sid: string) => ({
      bkk_teacher_id: teacher.id,
      school_id: sid
    }));
    const { error: jErr } = await supabase.from('bkk_teacher_schools').insert(junctionRows);
    if (jErr) {
      console.error('[bkk-teachers/create] junction error:', jErr);
      // Rollback: delete the teacher
      await supabase.from('bkk_teachers').delete().eq('id', teacher.id);
      return NextResponse.json({ error: 'Gagal link ke sekolah: ' + jErr.message }, { status: 500 });
    }

    // Get school names for response
    const schoolNames = validSchools.map((s) => s.name);

    const shareText = `Hai ${teacher.name}!

Kredensial login Dashboard BKK MAGANG-CERDAS Anda:
ID BKK: ${bkkId}
Email: ${teacher.email}
Password: ${password}

Sekolah yang Anda bimbing: ${schoolNames.join(', ')}

Login di: ${req.nextUrl.origin}/bkk/login

Selamat membimbing siswa magang di BPJS Ketenagakerjaan Cabang Cirebon!`;

    return NextResponse.json({
      success: true,
      teacher: {
        id: teacher.id,
        bkk_id: bkkId,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        raw_password: password,
        schools: validSchools
      },
      credentials: {
        bkk_id: bkkId,
        email: teacher.email,
        password,
        shareText
      }
    });
  } catch (e: any) {
    console.error('[bkk-teachers/create] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
