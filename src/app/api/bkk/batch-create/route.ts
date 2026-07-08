// ============================================================
// /api/bkk/batch-create — BKK batch upload peserta via Excel/CSV
// Sama seperti admin batch-create tapi:
// - Auth: BKK (bukan admin)
// - school_origin: auto-set dari sekolah BKK (tidak bisa pilih sendiri)
// - Hanya bisa create peserta untuk sekolah yang dibimbing
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getBKKToken, generateInternCredentials, hashPassword } from '@/lib/auth';
import { syncInternToSystemGroups } from '@/lib/system-groups';
import { Intern, Department } from '@/types';

const VALID_DEPARTMENTS: Department[] = ['Pelayanan', 'Pemasaran', 'Keuangan'];

export async function POST(req: NextRequest) {
  try {
    const bkk = await getBKKToken();
    if (!bkk) {
      return NextResponse.json({ error: 'Unauthorized — BKK only' }, { status: 401 });
    }

    if (!bkk.schools || bkk.schools.length === 0) {
      return NextResponse.json({ error: 'Akun BKK Anda belum di-link ke sekolah manapun' }, { status: 400 });
    }

    const body = await req.json();
    const { interns } = body;

    if (!Array.isArray(interns) || interns.length === 0) {
      return NextResponse.json({ error: 'Data peserta tidak valid' }, { status: 400 });
    }

    if (interns.length > 100) {
      return NextResponse.json({ error: 'Maksimal 100 peserta per upload' }, { status: 400 });
    }

    const supabase = createServerClient();
    const results: any[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < interns.length; i++) {
      const item = interns[i];
      const row = i + 2; // Excel row (header = row 1)

      try {
        // Validasi field wajib
        if (!item.name?.trim()) {
          results.push({ index: row, success: false, name: '', error: 'Nama wajib diisi' });
          failCount++;
          continue;
        }
        if (!item.major?.trim()) {
          results.push({ index: row, success: false, name: item.name, error: 'Jurusan wajib diisi' });
          failCount++;
          continue;
        }
        if (!item.department || !VALID_DEPARTMENTS.includes(item.department)) {
          results.push({ index: row, success: false, name: item.name, error: `Departemen harus: ${VALID_DEPARTMENTS.join(', ')}` });
          failCount++;
          continue;
        }

        // Default dates
        const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        const startDate = item.start_date || today;
        const endDate = item.end_date || new Date(Date.now() + 90 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

        // School origin: auto-set dari sekolah BKK
        // Jika BKK bimbing 1 sekolah, auto-set. Kalau >1, BKK pilih di form.
        const schoolOrigin = item.school_origin?.trim() || (bkk.schools.length === 1 ? bkk.schools[0] : '');

        if (!schoolOrigin) {
          results.push({ index: row, success: false, name: item.name, error: 'Sekolah wajib diisi' });
          failCount++;
          continue;
        }

        if (!bkk.schools.includes(schoolOrigin)) {
          results.push({ index: row, success: false, name: item.name, error: `Sekolah "${schoolOrigin}" tidak termasuk sekolah yang Anda bimbing` });
          failCount++;
          continue;
        }

        // Generate credentials
        const { username, password } = generateInternCredentials(item.name);
        const passwordHash = await hashPassword(password);

        const { data, error } = await supabase
          .from('interns')
          .insert({
            name: item.name.trim(),
            school_origin: schoolOrigin,
            major: item.major.trim(),
            department: item.department,
            start_date: startDate,
            end_date: endDate,
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
          })
          .select()
          .single();

        if (error) {
          results.push({ index: row, success: false, name: item.name, error: error.message });
          failCount++;
          continue;
        }

        // Sync to system groups
        await syncInternToSystemGroups(supabase, data.id, data.department, true);

        results.push({
          index: row,
          success: true,
          name: item.name,
          username,
          raw_password: password,
          department: item.department,
          school: schoolOrigin
        });
        successCount++;
      } catch (e: any) {
        results.push({ index: row, success: false, name: item.name, error: e.message });
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      total: interns.length,
      success_count: successCount,
      fail_count: failCount,
      results
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
