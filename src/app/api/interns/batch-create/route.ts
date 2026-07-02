// ============================================================
// /api/interns/batch-create — Batch create interns from array
// Input: { interns: [{ name, major, department, school_origin, start_date, end_date }] }
// Output: { results: [{ name, username, raw_password, error? }] }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken, generateInternCredentials, hashPassword } from '@/lib/auth';
import { Department } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { interns } = await req.json();
    if (!Array.isArray(interns) || interns.length === 0) {
      return NextResponse.json({ error: 'Data peserta wajib diisi (array)' }, { status: 400 });
    }
    if (interns.length > 100) {
      return NextResponse.json({ error: 'Maksimal 100 peserta per batch' }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: any[] = [];

    for (let i = 0; i < interns.length; i++) {
      const item = interns[i];
      try {
        // Validate
        if (!item.name?.trim()) {
          results.push({ index: i + 1, name: item.name || '(kosong)', error: 'Nama wajib diisi' });
          continue;
        }
        if (!item.department || !VALID_DEPARTMENTS.includes(item.department)) {
          results.push({ index: i + 1, name: item.name, error: `Departemen tidak valid: ${item.department}` });
          continue;
        }

        // Generate credentials
        const { username, password } = generateInternCredentials(item.name);
        const passwordHash = await hashPassword(password);

        // Insert
        const { data, error } = await supabase.from('interns').insert({
          name: item.name.trim(),
          school_origin: item.school_origin?.trim() || null,
          major: item.major?.trim() || 'Umum',
          department: item.department,
          start_date: item.start_date || new Date().toISOString().split('T')[0],
          end_date: item.end_date || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          email: item.email?.trim() || null,
          whatsapp: item.whatsapp?.trim() || null,
          username,
          password_hash: passwordHash,
          raw_password: password,
          total_exp: 0,
          streak_count: 0,
          is_active: true,
          logbook_enabled: true,
          survival_kit_progress: {},
          certificate_unlocked: false
        }).select().single();

        if (error) {
          results.push({ index: i + 1, name: item.name, error: error.message });
        } else {
          results.push({
            index: i + 1,
            name: data.name,
            username: data.username,
            raw_password: data.raw_password,
            major: data.major,
            department: data.department,
            school_origin: data.school_origin,
            email: data.email,
            whatsapp: data.whatsapp,
            success: true
          });
        }
      } catch (e: any) {
        results.push({ index: i + 1, name: item.name || '(error)', error: e.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} peserta berhasil dibuat, ${errorCount} gagal`,
      results,
      success_count: successCount,
      error_count: errorCount
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
