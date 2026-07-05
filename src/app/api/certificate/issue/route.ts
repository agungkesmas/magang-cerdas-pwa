// ============================================================
// /api/certificate/issue — Admin issues certificate to intern
// Generates PDF on server using pdfkit-like approach with jspdf
// Stores PDF URL in Certificates table, unlocks in Intern profile
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { generateVerificationId, calculateTier, formatDateID } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { intern_id, tier_override } = await req.json();
    if (!intern_id) {
      return NextResponse.json({ error: 'intern_id wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Get intern data
    const { data: intern } = await supabase
      .from('interns')
      .select('*')
      .eq('id', intern_id)
      .single();
    if (!intern) {
      return NextResponse.json({ error: 'Intern tidak ditemukan' }, { status: 404 });
    }

    // Get active official
    const { data: official } = await supabase
      .from('officials')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();
    if (!official) {
      return NextResponse.json({ error: 'Belum ada Kepala Cabang aktif. Set di Settings dulu.' }, { status: 400 });
    }

    // Calculate tier (dinamis berdasarkan durasi magang per peserta)
    const tier = tier_override || calculateTier(intern.total_exp || 0, intern.start_date, intern.end_date);

    // Generate verification ID
    const verificationId = generateVerificationId();

    // Create certificate record
    const { data: cert, error: certError } = await supabase
      .from('certificates')
      .insert({
        intern_id,
        official_id: official.id,
        tier,
        verification_id: verificationId,
        pdf_url: null // will be set when PDF generated on client and uploaded
      })
      .select()
      .single();

    if (certError) {
      return NextResponse.json({ error: certError.message }, { status: 500 });
    }

    // Update intern profile: unlock vault, set certificate_id
    await supabase
      .from('interns')
      .update({
        certificate_unlocked: true,
        certificate_id: cert.id
      })
      .eq('id', intern_id);

    return NextResponse.json({
      success: true,
      certificate: cert,
      intern: {
        name: intern.name,
        major: intern.major,
        total_exp: intern.total_exp
      },
      official: {
        name: official.name,
        nip: official.nip,
        position: official.position,
        signature_url: official.signature_url
      },
      verification_url: `${req.nextUrl.origin}/api/certificate/verify?id=${verificationId}`
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
