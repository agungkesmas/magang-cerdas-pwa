// ============================================================
// /api/certificate/verify — Public verification endpoint
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Verification ID wajib diisi' }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: cert, error } = await supabase
      .from('Certificates')
      .select('*, Interns!inner(name, major, department, school_origin, start_date, end_date, total_exp), Officials(name, nip, position, signature_url)')
      .eq('verification_id', id.toUpperCase())
      .single();

    if (error || !cert) {
      return NextResponse.json({ valid: false, error: 'Sertifikat tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      certificate: {
        verification_id: cert.verification_id,
        tier: cert.tier,
        issue_date: cert.issue_date,
        intern: cert.Interns,
        official: cert.Officials
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
