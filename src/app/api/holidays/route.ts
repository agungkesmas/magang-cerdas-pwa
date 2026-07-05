// ============================================================
// /api/holidays — List semua hari libur (nasional + custom BPJS)
// Public read (untuk display di dashboard peserta)
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getNationalHolidays, setCustomHolidays, getCustomHolidays } from '@/lib/holidays';

export async function GET() {
  try {
    const year = new Date().getFullYear();
    const nationalHolidays = getNationalHolidays(year);

    // Load custom holidays dari DB (kalau ada)
    let customHolidays: any[] = [];
    try {
      const supabase = createServerClient();
      const { data } = await supabase
        .from('app_holidays')
        .select('date, name, type')
        .order('date', { ascending: true });
      customHolidays = (data || []).map((h: any) => ({
        date: h.date,
        name: h.name,
        type: h.type || 'custom'
      }));
      // Update cache
      setCustomHolidays(customHolidays);
    } catch (e) {
      // Tabel belum ada — skip
      console.warn('[holidays] Tabel app_holidays belum tersedia, skip custom holidays');
    }

    // Combine + sort
    const all = [...nationalHolidays, ...customHolidays].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      success: true,
      holidays: all,
      national_count: nationalHolidays.length,
      custom_count: customHolidays.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
