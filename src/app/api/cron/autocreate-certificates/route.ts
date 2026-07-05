// ============================================================
// /api/cron/autocreate-certificates — Auto-create sertifikat untuk peserta
// yang sudah selesai magang + 7 hari grace period TAPI belum punya sertifikat
//
// Trigger:
//   1. Vercel Cron (setiap jam) — pakai header authorization
//   2. Manual trigger dari admin (POST dengan admin token)
//
// Logic:
//   - Cari semua intern yang:
//     * end_date + 7 hari <= NOW() (grace period selesai)
//     * (certificate_unlocked = false ATAU certificate_id IS NULL)
//     * Tidak ada di tabel certificates
//   - Untuk setiap intern:
//     * Cek apakah ada Kepala Cabang aktif (kalau tidak ada, skip + log warning)
//     * Hitung tier dinamis berdasarkan total_exp & durasi magang
//     * Generate verification_id (crypto-secure)
//     * Insert ke tabel certificates
//     * Update interns.certificate_unlocked = true, certificate_id = new cert id
//     * Insert ke certificate_autocreate_logs (audit trail)
//     * Kirim nudge ke peserta: "Sertifikat Anda telah diterbitkan otomatis"
//
// Security:
//   - Vercel Cron: pakai CRON_SECRET di header (Authorization: Bearer xxx)
//   - Manual trigger: pakai admin token (getAdminToken)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { generateVerificationId, calculateTier } from '@/lib/utils';
import { ensureCustomHolidaysLoaded } from '@/lib/holidays-loader';

const GRACE_PERIOD_DAYS = 7;

export async function POST(req: NextRequest) {
  try {
    // === Auth check: cron secret ATAU admin token ===
    const authHeader = req.headers.get('authorization') || '';
    const cronSecret = process.env.CRON_SECRET;
    const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;

    let adminEmail: string | null = null;
    if (!isCronRequest) {
      const admin = await getAdminToken();
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — butuh CRON_SECRET atau admin token' }, { status: 401 });
      }
      adminEmail = admin.email;
    }

    await ensureCustomHolidaysLoaded();
    const supabase = createServerClient();

    // === 1. Cari Kepala Cabang aktif ===
    const { data: official, error: offErr } = await supabase
      .from('officials')
      .select('id, name, position')
      .eq('is_active', true)
      .maybeSingle();

    if (offErr || !official) {
      return NextResponse.json({
        success: false,
        error: 'Belum ada Kepala Cabang aktif. Set dulu di Pengaturan → Kepala Cabang.',
        skipped: 0,
        created: 0
      }, { status: 400 });
    }

    // === 2. Cari intern yang eligible untuk auto-create ===
    // end_date + 7 hari <= today, belum ada certificate
    const gracePeriodEnd = new Date();
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() - GRACE_PERIOD_DAYS);
    const gracePeriodEndStr = gracePeriodEnd.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: eligibleInterns, error: iErr } = await supabase
      .from('interns')
      .select('id, name, total_exp, start_date, end_date, department, certificate_unlocked, certificate_id')
      .lte('end_date', gracePeriodEndStr) // end_date <= (today - 7 hari)
      .or('certificate_unlocked.is.false,certificate_id.is.null');

    if (iErr) {
      console.error('[autocreate] query error:', iErr);
      return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    if (!eligibleInterns || eligibleInterns.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada peserta yang perlu auto-create sertifikat',
        created: 0,
        skipped: 0,
        details: []
      });
    }

    // === 3. Untuk setiap intern, cek apakah sudah ada sertifikat di tabel certificates ===
    const internIds = eligibleInterns.map((i: any) => i.id);
    const { data: existingCerts } = await supabase
      .from('certificates')
      .select('id, intern_id')
      .in('intern_id', internIds);
    const existingCertInternIds = new Set((existingCerts || []).map((c: any) => c.intern_id));

    const toCreate = eligibleInterns.filter((i: any) => !existingCertInternIds.has(i.id));

    if (toCreate.length === 0) {
      // Update flag certificate_unlocked untuk yang sudah ada cert tapi flag-nya false
      const toFixFlag = eligibleInterns.filter((i: any) => existingCertInternIds.has(i.id));
      for (const intern of toFixFlag) {
        const cert = (existingCerts || []).find((c: any) => c.intern_id === intern.id);
        if (cert) {
          await supabase
            .from('interns')
            .update({ certificate_unlocked: true, certificate_id: cert.id })
            .eq('id', intern.id);
        }
      }
      return NextResponse.json({
        success: true,
        message: `${toFixFlag.length} peserta sudah punya sertifikat, flag diperbaiki`,
        created: 0,
        fixed_flag: toFixFlag.length,
        details: []
      });
    }

    // === 4. Auto-create sertifikat untuk setiap intern ===
    const results: any[] = [];
    let created = 0;
    let skipped = 0;

    for (const intern of toCreate) {
      try {
        // Cek apakah end_date + 7 hari sudah lewat (double-check)
        const endDate = new Date(intern.end_date);
        const graceEnd = new Date(endDate);
        graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
        if (graceEnd > new Date()) {
          skipped++;
          results.push({
            intern_id: intern.id,
            name: intern.name,
            status: 'skipped',
            reason: 'Grace period belum selesai'
          });
          continue;
        }

        // Hitung tier dinamis
        const tier = calculateTier(intern.total_exp || 0, intern.start_date, intern.end_date);
        const verificationId = generateVerificationId();

        // Cek verification_id unik (very unlikely collision, tapi jaga-jaga)
        const { data: existingVid } = await supabase
          .from('certificates')
          .select('id')
          .eq('verification_id', verificationId)
          .maybeSingle();
        if (existingVid) {
          // Recursion sangat jarang, skip saja
          skipped++;
          results.push({
            intern_id: intern.id,
            name: intern.name,
            status: 'skipped',
            reason: 'Verification ID collision (retry next run)'
          });
          continue;
        }

        // Insert certificate
        const { data: cert, error: certErr } = await supabase
          .from('certificates')
          .insert({
            intern_id: intern.id,
            official_id: official.id,
            tier,
            issue_date: new Date().toISOString().split('T')[0],
            verification_id: verificationId,
            pdf_url: null
          })
          .select()
          .single();

        if (certErr || !cert) {
          console.error('[autocreate] insert cert error:', certErr);
          skipped++;
          results.push({
            intern_id: intern.id,
            name: intern.name,
            status: 'error',
            reason: certErr?.message || 'Insert failed'
          });
          continue;
        }

        // Update intern flag
        await supabase
          .from('interns')
          .update({
            certificate_unlocked: true,
            certificate_id: cert.id
          })
          .eq('id', intern.id);

        // Insert audit log
        await supabase
          .from('certificate_autocreate_logs')
          .insert({
            certificate_id: cert.id,
            intern_id: intern.id,
            tier,
            trigger_type: isCronRequest ? 'cron' : 'manual',
            trigger_source: isCronRequest ? 'vercel-cron' : `admin:${adminEmail}`,
            reason: `Auto-create: grace period ${GRACE_PERIOD_DAYS} hari selesai (end_date: ${intern.end_date}), admin belum terbitkan manual`,
            total_exp_at_creation: intern.total_exp || 0
          });

        // Kirim nudge ke peserta
        await supabase.from('nudges').insert({
          intern_id: intern.id,
          message: `🎓 Sertifikat magang Anda telah diterbitkan otomatis oleh sistem. Tier: ${tier}. Verification ID: ${verificationId}. Lihat di menu Vault.`,
          type: 'certificate_autocreate'
        });

        created++;
        results.push({
          intern_id: intern.id,
          name: intern.name,
          status: 'created',
          tier,
          verification_id: verificationId,
          total_exp: intern.total_exp || 0
        });
      } catch (e: any) {
        console.error('[autocreate] error for intern', intern.id, e);
        skipped++;
        results.push({
          intern_id: intern.id,
          name: intern.name,
          status: 'error',
          reason: e.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Auto-create selesai: ${created} sertifikat dibuat, ${skipped} dilewati`,
      created,
      skipped,
      total_eligible: toCreate.length,
      details: results
    });
  } catch (e: any) {
    console.error('[autocreate] fatal error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// === GET endpoint untuk Vercel Cron (POST lebih secure, tapi support GET juga) ===
export async function GET(req: NextRequest) {
  return POST(req);
}
