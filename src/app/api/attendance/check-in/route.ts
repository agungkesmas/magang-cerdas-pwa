// ============================================================
// /api/attendance/check-in — Geofenced + camera check-in
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getInternToken } from '@/lib/auth';
import { haversineDistance, EXP_REWARDS } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const intern = await getInternToken();
    if (!intern) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude, photo_url, notes } = await req.json();
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json({ error: 'Koordinat GPS tidak valid' }, { status: 400 });
    }

    // Get office coords from App_Settings
    const supabase = createServerClient();
    const { data: settings } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, geofence_radius_meters')
      .eq('id', 1)
      .single();

    const officeLat = settings?.office_lat ?? parseFloat(process.env.NEXT_PUBLIC_GEOLOC_OFFICE_LAT || '-6.7418620');
    const officeLng = settings?.office_lng ?? parseFloat(process.env.NEXT_PUBLIC_GEOLOC_OFFICE_LNG || '108.5420607');
    const radius = settings?.geofence_radius_meters ?? 150;

    const distance = haversineDistance(latitude, longitude, officeLat, officeLng);
    const isWithin = distance <= radius;

    if (!isWithin) {
      return NextResponse.json(
        {
          error: `Anda berada ${distance}m dari kantor. Radius maksimal ${radius}m.`,
          distance,
          radius
        },
        { status: 403 }
      );
    }

    // Check if already checked in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', todayStart.toISOString())
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Anda sudah check-in hari ini' }, { status: 400 });
    }

    // Insert attendance
    const { data: att, error } = await supabase
      .from('attendance')
      .insert({
        intern_id: intern.intern_id,
        type: 'Check-In',
        latitude,
        longitude,
        distance_meters: distance,
        photo_url,
        is_within_geofence: true,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Grant EXP
    const { data: internData } = await supabase
      .from('interns')
      .select('total_exp, streak_count')
      .eq('id', intern.intern_id)
      .single();

    if (internData) {
      const newExp = (internData.total_exp || 0) + EXP_REWARDS.CHECK_IN;
      const newStreak = (internData.streak_count || 0) + 1;
      await supabase
        .from('interns')
        .update({ total_exp: newExp, streak_count: newStreak })
        .eq('id', intern.intern_id);
    }

    return NextResponse.json({
      success: true,
      attendance: att,
      exp_gained: EXP_REWARDS.CHECK_IN,
      distance_meters: distance,
      new_total_exp: (internData?.total_exp || 0) + EXP_REWARDS.CHECK_IN
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
