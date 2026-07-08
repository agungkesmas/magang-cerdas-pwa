// ============================================================
// /api/admin/update-geofence — Update koordinat kantor di DB
// One-time fix untuk koreksi koordinat BPJS Ketenagakerjaan
// Cabang Cirebon (Jl. Evakuasi 11B, Karyamulya, Kesambi)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';

const CORRECT_LAT = -6.7386200;
const CORRECT_LNG = 108.5372200;
const CORRECT_ADDRESS = 'Jl. Evakuasi No. 11B, Karyamulya, Kesambi, Cirebon 45135';

export async function POST() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get current settings
    const { data: before } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, office_name, office_address, geofence_radius_meters')
      .eq('id', 1)
      .single();

    // Update ke koordinat presisi
    const { data: after, error } = await supabase
      .from('app_settings')
      .update({
        office_lat: CORRECT_LAT,
        office_lng: CORRECT_LNG,
        office_address: CORRECT_ADDRESS,
        office_name: 'BPJS Ketenagakerjaan Cabang Cirebon'
      })
      .eq('id', 1)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Update error: ' + error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Koordinat kantor berhasil diupdate ke lokasi presisi Jl. Evakuasi 11B',
      before: before,
      after: after,
      note: 'Peserta magang sekarang bisa check-in dari dalam gedung BPJS, tidak perlu di pinggir jalan lagi. Radius geofence tetap 150m.'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
