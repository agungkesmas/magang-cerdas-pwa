// ============================================================
// /api/attendance/check-out — Check-out with optional photo
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
    const supabase = createServerClient();

    // Verify checked in today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: checkIn } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-In')
      .gte('timestamp', todayStart.toISOString())
      .maybeSingle();

    if (!checkIn) {
      return NextResponse.json({ error: 'Anda belum check-in hari ini' }, { status: 400 });
    }

    // Check not already checked out
    const { data: checkOut } = await supabase
      .from('attendance')
      .select('id')
      .eq('intern_id', intern.intern_id)
      .eq('type', 'Check-Out')
      .gte('timestamp', todayStart.toISOString())
      .maybeSingle();

    if (checkOut) {
      return NextResponse.json({ error: 'Anda sudah check-out hari ini' }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('office_lat, office_lng, geofence_radius_meters')
      .eq('id', 1)
      .single();

    const officeLat = settings?.office_lat ?? -6.7418620;
    const officeLng = settings?.office_lng ?? 108.5420607;
    const radius = settings?.geofence_radius_meters ?? 150;

    const distance =
      latitude && longitude ? haversineDistance(latitude, longitude, officeLat, officeLng) : null;
    const isWithin = distance !== null ? distance <= radius : false;

    const { data: att, error } = await supabase
      .from('attendance')
      .insert({
        intern_id: intern.intern_id,
        type: 'Check-Out',
        latitude: latitude || null,
        longitude: longitude || null,
        distance_meters: distance,
        photo_url: photo_url || null,
        is_within_geofence: isWithin,
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
      .select('total_exp')
      .eq('id', intern.intern_id)
      .single();

    if (internData) {
      const newExp = (internData.total_exp || 0) + EXP_REWARDS.CHECK_OUT;
      await supabase.from('interns').update({ total_exp: newExp }).eq('id', intern.intern_id);
    }

    return NextResponse.json({
      success: true,
      attendance: att,
      exp_gained: EXP_REWARDS.CHECK_OUT,
      new_total_exp: (internData?.total_exp || 0) + EXP_REWARDS.CHECK_OUT
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
