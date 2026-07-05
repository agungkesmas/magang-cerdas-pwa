// ============================================================
// /api/auth/intern-login — Intern username+password login
// Auto-archive: check end_date + 7 day grace period
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyPassword, signInternToken, setInternCookie } from '@/lib/auth';
import { syncInternToSystemGroups } from '@/lib/system-groups';

const GRACE_PERIOD_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Cari intern — cek is_active true (untuk yang masih aktif)
    // ATAU cari berdasarkan username saja (untuk kasus auto-archive)
    const { data: intern, error } = await supabase
      .from('interns')
      .select('*')
      .eq('username', username.trim().toUpperCase())
      .single();

    if (error || !intern) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const valid = await verifyPassword(password, intern.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    // ============================================================
    // AUTO-ARCHIVE CHECK: end_date + grace period
    // ============================================================
    const now = new Date();
    const endDate = new Date(intern.end_date);
    const graceEndDate = new Date(endDate);
    graceEndDate.setDate(graceEndDate.getDate() + GRACE_PERIOD_DAYS);

    if (now > graceEndDate) {
      // Grace period habis — auto-archive jika masih aktif
      if (intern.is_active) {
        await supabase.from('interns').update({ is_active: false }).eq('id', intern.id);
        await syncInternToSystemGroups(supabase, intern.id, intern.department, false);
      }
      return NextResponse.json({
        error: `Masa magang Anda telah selesai pada ${endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}. Hubungi admin BPJS untuk informasi lebih lanjut.`
      }, { status: 403 });
    }

    // Dalam grace period — masih bisa login tapi dengan warning
    const inGracePeriod = now > endDate && now <= graceEndDate;
    const daysAfterEnd = Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));

    const token = signInternToken({
      sub: intern.id,
      intern_id: intern.id,
      name: intern.name,
      username: intern.username,
      department: intern.department
    });
    await setInternCookie(token);

    return NextResponse.json({
      success: true,
      intern: {
        id: intern.id,
        name: intern.name,
        username: intern.username,
        major: intern.major,
        department: intern.department,
        total_exp: intern.total_exp,
        streak_count: intern.streak_count
      },
      warning: inGracePeriod
        ? `Masa magang Anda berakhir ${daysAfterEnd} hari lalu. Anda masih bisa mengakses dashboard selama ${GRACE_PERIOD_DAYS - daysAfterEnd} hari lagi. Segera unduh sertifikat dan data Anda.`
        : null
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
