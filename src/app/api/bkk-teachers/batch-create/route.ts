// ============================================================
// /api/bkk-teachers/batch-create — Batch create BKK teachers from array
// Input: { teachers: [{ name, email, school_names: string[], phone }] }
// Auto-create school jika belum ada (sama seperti interns batch)
// Output: { results: [{ name, bkk_id, raw_password, error? }] }
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

async function generateBKKId(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('bkk_teachers')
    .select('bkk_id')
    .not('bkk_id', 'is', null)
    .order('bkk_id', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return 'BKK-0001';
  const match = data[0].bkk_id?.match(/^BKK-(\d+)$/);
  if (!match) return 'BKK-0001';
  return `BKK-${String(parseInt(match[1], 10) + 1).padStart(4, '0')}`;
}

function normalizeSchoolName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

// School cache untuk avoid repeated DB queries dalam 1 request
const schoolCache = new Map<string, string>(); // name → id

async function ensureSchoolExists(supabase: any, rawName: string): Promise<string | null> {
  const name = normalizeSchoolName(rawName);
  if (!name) return null;

  if (schoolCache.has(name)) return schoolCache.get(name)!;

  // Cek di DB (case-insensitive)
  const { data: existing } = await supabase
    .from('schools')
    .select('id, name')
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    schoolCache.set(name, existing.id);
    return existing.id;
  }

  // Auto-create
  const { data: newSchool, error } = await supabase
    .from('schools')
    .insert({ name, logbook_enabled: true })
    .select('id')
    .single();

  if (error) {
    console.error('[bkk batch-create] Failed to create school:', name, error.message);
    return null;
  }

  schoolCache.set(name, newSchool.id);
  return newSchool.id;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { teachers } = await req.json();
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return NextResponse.json({ error: 'Data BKK wajib diisi (array)' }, { status: 400 });
    }
    if (teachers.length > 100) {
      return NextResponse.json({ error: 'Maksimal 100 BKK per batch' }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: any[] = [];
    const autoCreatedSchools: string[] = [];

    for (let i = 0; i < teachers.length; i++) {
      const item = teachers[i];
      try {
        if (!item.name?.trim()) {
          results.push({ index: i + 1, name: item.name || '(kosong)', error: 'Nama wajib diisi' });
          continue;
        }
        if (!item.email?.trim()) {
          results.push({ index: i + 1, name: item.name, error: 'Email wajib diisi' });
          continue;
        }

        // Cek email unik
        const { data: existing } = await supabase
          .from('bkk_teachers')
          .select('id')
          .eq('email', item.email.toLowerCase().trim())
          .maybeSingle();
        if (existing) {
          results.push({ index: i + 1, name: item.name, error: 'Email sudah terdaftar' });
          continue;
        }

        // Resolve school_ids (auto-create schools kalau belum ada)
        const schoolIds: string[] = [];
        for (const schoolName of (item.school_names || [])) {
          const sid = await ensureSchoolExists(supabase, schoolName);
          if (sid) schoolIds.push(sid);
        }

        if (schoolIds.length === 0) {
          results.push({ index: i + 1, name: item.name, error: 'Tidak ada sekolah valid' });
          continue;
        }

        const bkkId = await generateBKKId(supabase);
        const password = generateBKKPassword();
        const passwordHash = await hashPassword(password);

        const { data: teacher, error: tErr } = await supabase
          .from('bkk_teachers')
          .insert({
            bkk_id: bkkId,
            email: item.email.toLowerCase().trim(),
            password_hash: passwordHash,
            raw_password: password,
            name: item.name.trim(),
            phone: item.phone?.trim() || null,
            is_active: true
          })
          .select()
          .single();

        if (tErr) {
          results.push({ index: i + 1, name: item.name, error: tErr.message });
          continue;
        }

        // Link to schools
        const junctionRows = schoolIds.map((sid) => ({
          bkk_teacher_id: teacher.id,
          school_id: sid
        }));
        await supabase.from('bkk_teacher_schools').insert(junctionRows);

        results.push({
          index: i + 1,
          name: teacher.name,
          bkk_id: bkkId,
          email: teacher.email,
          raw_password: password,
          schools: item.school_names,
          success: true
        });
      } catch (e: any) {
        results.push({ index: i + 1, name: item.name || '(error)', error: e.message });
      }
    }

    // Collect auto-created schools
    for (const [name] of schoolCache.entries()) {
      // Check if it was newly created (not existing before) — we track via separate set
      // For simplicity, just list all unique school names that were processed
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} guru BKK berhasil dibuat, ${errorCount} gagal`,
      results,
      success_count: successCount,
      error_count: errorCount
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
