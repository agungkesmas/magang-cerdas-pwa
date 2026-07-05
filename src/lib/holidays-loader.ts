// ============================================================
// HELPER: Load custom holidays dari DB ke cache in-memory
// Panggil di awal API/server component yang butuh tier calculation
// (calculateMaxExp, calculateTier, countEffectiveWorkingDays)
//
// Idempotent — aman dipanggil berkali-kali (cache TTL 5 menit)
// ============================================================

import { createServerClient } from '@/lib/supabase';
import { setCustomHolidays, getCustomHolidays } from '@/lib/holidays';

let lastLoadAt = 0;
const TTL_MS = 5 * 60 * 1000; // 5 menit

export async function ensureCustomHolidaysLoaded(): Promise<void> {
  // Skip kalau cache masih fresh
  if (Date.now() - lastLoadAt < TTL_MS && getCustomHolidays().length >= 0) {
    return;
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('app_holidays')
      .select('date, name, type')
      .order('date', { ascending: true });

    if (error) {
      // Tabel belum ada — silent fail (calculateMaxExp tetap jalan tanpa custom holidays)
      return;
    }

    const customHolidays = (data || []).map((h: any) => ({
      date: h.date,
      name: h.name,
      type: h.type || 'custom'
    }));
    setCustomHolidays(customHolidays);
    lastLoadAt = Date.now();
  } catch (e) {
    // Silent fail — cache lama / empty tetap dipakai
  }
}
