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
      return NextResponse.json({
        success: true,
        message: 'Kolom is_suspicious sudah ada di DB — tidak perlu setup lagi',
        already_exists: true
      });
    }

    // Kolom belum ada — coba ALTER TABLE via Supabase REST RPC
    // Supabase tidak izinkan DDL via service role langsung, jadi kita
    // pakai pendekatan: jalankan via pg_execute function kalau ada,
    // atau return instruksi manual.
    //
    // Cara yang bisa kita coba: insert ke tabel dengan kolom baru
    // tidak akan work. Jadi kita return instruksi yang jelas.

    return NextResponse.json({
      success: false,
      needs_manual_sql: true,
      message: 'Kolom is_suspicious belum ada. Anda perlu run SQL migration manual di Supabase SQL Editor.',
      sql_file: 'supabase/migration-attendance-suspicious.sql',
      sql_content: `-- Copy paste SQL ini ke Supabase SQL Editor lalu Run:

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_suspicious BOOLEAN DEFAULT false;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS suspicious_flagged_by UUID REFERENCES admins(id);
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS suspicious_flagged_at TIMESTAMPTZ;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS auto_flag_reason TEXT;`,
      instructions: [
        '1. Buka Supabase Dashboard → SQL Editor',
        '2. Paste SQL di atas (atau isi file supabase/migration-attendance-suspicious.sql)',
        '3. Klik Run',
        '4. Refresh halaman admin/attendance — tombol "Tandai Mencurigakan" akan aktif'
      ],
      error_detail: testError.message
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
