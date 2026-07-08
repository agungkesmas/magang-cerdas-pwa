// ============================================================
// /api/admin/setup-corrections — Setup tabel attendance_corrections
// Cek apakah tabel sudah ada, return SQL kalau belum
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

    // Cek apakah tabel attendance_corrections sudah ada
    const { error: testError } = await supabase
      .from('attendance_corrections')
      .select('id')
      .limit(1);

    if (!testError) {
      // Cek juga kolom is_late di attendance
      const { error: lateCheck } = await supabase
        .from('attendance')
        .select('is_late')
        .limit(1);

      if (!lateCheck) {
        return NextResponse.json({
          success: true,
          already_exists: true,
          message: 'Tabel attendance_corrections + kolom is_late/is_early sudah ada'
        });
      }
    }

    // Tabel atau kolom belum ada — return SQL
    return NextResponse.json({
      success: false,
      needs_manual_sql: true,
      message: 'Setup diperlukan untuk fitur koreksi absen + flag terlambat/pulang awal',
      sql_content: `-- Copy paste SQL ini ke Supabase SQL Editor lalu Run:

-- 1. Tambah kolom is_late (check-in setelah 08:00 WIB)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false;

-- 2. Tambah kolom is_early (check-out sebelum 17:00 WIB)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_early BOOLEAN DEFAULT false;

-- 3. Buat tabel attendance_corrections
CREATE TABLE IF NOT EXISTS attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES interns(id),
  correction_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Check-In', 'Check-Out')),
  reason TEXT NOT NULL,
  promise_not_repeat BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES admins(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(intern_id, correction_date, type)
);

-- 4. Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_intern ON attendance_corrections(intern_id);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_status ON attendance_corrections(status);
CREATE INDEX IF NOT EXISTS idx_attendance_corrections_date ON attendance_corrections(correction_date);`,
      instructions: [
        '1. Buka Supabase Dashboard → SQL Editor',
        '2. Paste SQL di atas',
        '3. Klik Run',
        '4. Refresh halaman admin/attendance'
      ]
    }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
