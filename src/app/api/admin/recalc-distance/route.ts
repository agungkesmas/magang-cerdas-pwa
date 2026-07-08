// ============================================================
// /api/admin/recalc-distance — Hitung ulang jarak semua attendance
// records menggunakan koordinat kantor yang benar.
//
// Gunakan setelah koreksi koordinat kantor untuk fix record lama
// yang terdeteksi "di luar geofence" padahal sebenarnya di kantor.
//
// POST (no body) — recalculate ALL attendance records
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getAdminToken } from '@/lib/auth';
import { haversineDistance } from '@/lib/utils';

export async function POST() {
  try {
    const admin = await getAdminToken();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get current office settings (koordinat yang benar)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, geofence_radius_meters')
      .eq('id', 1)
      .single();

    if (!settings?.office_lat || !settings?.office_lng) {
      return NextResponse.json({ error: 'Koordinat kantor belum di-set di settings' }, { status: 400 });
    }

    const officeLat = settings.office_lat;
    const officeLng = settings.office_lng;
    const radius = settings.geofence_radius_meters || 200;

    // Fetch all attendance records yang punya lat/lng
    const { data: records, error: fetchErr } = await supabase
      .from('attendance')
      .select('id, latitude, longitude, distance_meters, is_within_geofence, type, timestamp, interns!inner(name)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('timestamp', { ascending: false })
      .limit(500);

    if (fetchErr) {
      return NextResponse.json({ error: 'Fetch error: ' + fetchErr.message }, { status: 500 });
    }

    if (!records || records.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada record dengan koordinat GPS untuk dihitung ulang',
        updated: 0
      });
    }

    // Recalculate each record
    const updates: any[] = [];
    const beforeAfter: any[] = [];

    for (const r of records) {
      const newDistance = haversineDistance(r.latitude, r.longitude, officeLat, officeLng);
      const newWithin = newDistance <= radius;

      // Hanya update kalau ada perubahan
      if (newDistance !== r.distance_meters || newWithin !== r.is_within_geofence) {
        updates.push({
          id: r.id,
          distance_meters: newDistance,
          is_within_geofence: newWithin
        });

        beforeAfter.push({
          id: r.id,
          intern_name: (r.interns as any)?.name,
          type: r.type,
          timestamp: r.timestamp,
          before: {
            distance: r.distance_meters,
            within: r.is_within_geofence
          },
          after: {
            distance: newDistance,
            within: newWithin
          }
        });
      }
    }

    // Batch update (Supabase tidak support bulk update dengan kondisi berbeda per row,
    // jadi update satu per satu)
    let updatedCount = 0;
    for (const u of updates) {
      const { error: updateErr } = await supabase
        .from('attendance')
        .update({
          distance_meters: u.distance_meters,
          is_within_geofence: u.is_within_geofence
        })
        .eq('id', u.id);

      if (!updateErr) updatedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil! ${updatedCount} record attendance dihitung ulang dengan koordinat kantor baru.`,
      office_coords: { lat: officeLat, lng: officeLng, radius },
      total_records: records.length,
      updated: updatedCount,
      unchanged: records.length - updatedCount,
      changes: beforeAfter.slice(0, 20) // tampilkan 20 contoh perubahan
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
