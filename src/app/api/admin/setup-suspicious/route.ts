// ============================================================
// /api/admin/setup-suspicious — Setup kolom attendance flag
// One-time admin endpoint untuk apply migration-attendance-suspicious.sql
// ke DB production tanpa user perlu run SQL manual.
// Idempotent — aman dijalankan ulang.
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

export async function POST() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Cek apakah kolom is_suspicious sudah ada
    const { data: testSelect, error: testError } = await supabase
      .from('attendance')
      .select('is_suspicious')
      .limit(1);

    if (!testError) {
      // Kolom sudah ada — return early
      return NextResponse.json({
        success: true,
        message: 'Kolom is_suspicious sudah ada di DB — tidak perlu setup lagi',
        already_exists: true
      });
    }

    // Kalau error "column does not exist", kita perlu setup
    // Tapi Supabase JS client tidak bisa ALTER TABLE langsung.
    // Solusi: return instruksi untuk user run SQL migration.
    return NextResponse.json({
      success: false,
      needs_manual_sql: true,
      message: 'Kolom is_suspicious belum ada. User perlu run SQL migration manual di Supabase SQL Editor.',
      sql_file: 'supabase/migration-attendance-suspicious.sql',
      instructions: [
        '1. Buka Supabase Dashboard → SQL Editor',
        '2. Paste isi file supabase/migration-attendance-suspicious.sql',
        '3. Klik Run',
        '4. Refresh halaman ini / panggil endpoint lagi untuk verify'
      ],
      error_detail: testError.message
    }, { status: 200 }); // 200 bukan 500 karena ini expected state
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
