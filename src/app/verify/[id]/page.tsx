// ============================================================
// /verify/[id] — Halaman publik verifikasi sertifikat
// Akses: Public (siapa saja dengan verification_id bisa cek)
// Tampilkan: status valid, data peserta, statistik magang, QR code
// TIDAK menampilkan: aktivitas detail (privacy)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { calculateTier, calculateMaxExp, countWorkingDays } from '@/lib/utils';
import { ensureCustomHolidaysLoaded } from '@/lib/holidays-loader';
import VerifyPageClient from './VerifyPageClient';

// ============================================================
// Server Component — fetch data di server (SEO friendly, no JS needed)
// ============================================================
export default async function VerifyPage({ params }: { params: { id: string } }) {
  const verificationId = params.id?.toUpperCase();

  if (!verificationId) {
    return <VerifyPageClient data={null} error="Verification ID tidak valid" />;
  }

  try {
    await ensureCustomHolidaysLoaded();
    const supabase = createServerClient();

    const { data: cert, error } = await supabase
      .from('certificates')
      .select(`
        id,
        verification_id,
        tier,
        issue_date,
        created_at,
        intern_id,
        interns!inner(
          id, name, major, department, school_origin,
          start_date, end_date, total_exp, streak_count, photo_url
        ),
        officials(name, nip, position, branch, signature_url)
      `)
      .eq('verification_id', verificationId)
      .maybeSingle();

    if (error || !cert) {
      return <VerifyPageClient data={null} error="Sertifikat tidak ditemukan. Pastikan ID verifikasi benar." />;
    }

    // Cast array (supabase type infers as array sometimes)
    const intern: any = Array.isArray(cert.interns) ? cert.interns[0] : cert.interns;
    const official: any = Array.isArray(cert.officials) ? cert.officials[0] : cert.officials;

    if (!intern) {
      return <VerifyPageClient data={null} error="Data peserta tidak ditemukan." />;
    }

    // Hitung statistik magang
    const workingDays = countWorkingDays(intern.start_date, intern.end_date);
    const maxExp = calculateMaxExp(intern.start_date, intern.end_date);
    const tier = cert.tier as 'Excellence' | 'Competent' | 'Participation';
    const achievementPercent = maxExp > 0 ? Math.min(100, Math.round((intern.total_exp / maxExp) * 100)) : 0;

    // Hitung total jam magang (asumsi 8 jam/hari kerja)
    const totalHours = workingDays * 8;

    // Durasi magang dalam bulan
    const startDate = new Date(intern.start_date);
    const endDate = new Date(intern.end_date);
    const durationMonths = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

    const data = {
      valid: true,
      certificate: {
        verification_id: cert.verification_id,
        tier: cert.tier,
        issue_date: cert.issue_date,
        created_at: cert.created_at
      },
      intern: {
        name: intern.name,
        major: intern.major,
        department: intern.department,
        school_origin: intern.school_origin,
        start_date: intern.start_date,
        end_date: intern.end_date,
        total_exp: intern.total_exp,
        streak_count: intern.streak_count,
        photo_url: intern.photo_url
      },
      official: official ? {
        name: official.name,
        nip: official.nip,
        position: official.position,
        branch: official.branch,
        signature_url: official.signature_url
      } : null,
      stats: {
        working_days: workingDays,
        total_hours: totalHours,
        duration_months: durationMonths,
        max_exp: maxExp,
        achievement_percent: achievementPercent,
        tier: tier
      }
    };

    return <VerifyPageClient data={data} error={null} />;
  } catch (e: any) {
    console.error('[verify] error:', e);
    return <VerifyPageClient data={null} error="Terjadi kesalahan server. Coba lagi nanti." />;
  }
}
