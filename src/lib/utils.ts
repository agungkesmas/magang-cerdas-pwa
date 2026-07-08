// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// TIMEZONE HELPERS — WIB (Asia/Jakarta, UTC+7)
//
// Penting: Vercel server run di UTC. Browser user di WIB.
// Bug lama: pakai `new Date().toISOString().split('T')[0]` yang
// convert ke UTC dulu. Saat user di WIB jam 00:00-07:00,
// "hari ini" dianggap "hari kemarin" UTC → filter tanggal salah.
//
// Semua logika "hari ini" WAJIB pakai helper di bawah ini.
// ============================================================

/**
 * Return YYYY-MM-DD tanggal hari ini di timezone WIB.
 * Bisa dipakai di server (UTC) maupun client (WIB).
 *
 * Contoh:
 *   - Server UTC, jam 23:30 UTC tanggal 8 Juli → WIB = 06:30 tanggal 9 Juli → return "2026-07-09"
 *   - Client WIB, jam 00:15 tanggal 9 Juli → return "2026-07-09"
 */
export function getWIBToday(now: Date = new Date()): string {
  // Format YYYY-MM-DD dengan locale en-CA + timeZone Asia/Jakarta
  return now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
}

/**
 * Return range [start, end] untuk query "hari ini" di timezone WIB.
 * Start = 00:00:00.000 WIB (=> 17:00:00.000 UTC hari sebelumnya)
 * End   = 23:59:59.999 WIB (=> 16:59:59.999 UTC hari yang sama)
 *
 * Pakai range ini untuk `.gte('timestamp', start.toISOString())`
 * dan `.lte('timestamp', end.toISOString())` di query Supabase.
 */
export function getWIBTodayRange(now: Date = new Date()): { start: Date; end: Date } {
  const todayStr = getWIBToday(now);
  // Buat Date object dengan explicit WIB offset
  const start = new Date(`${todayStr}T00:00:00+07:00`);
  const end = new Date(`${todayStr}T23:59:59.999+07:00`);
  return { start, end };
}

/**
 * Return range [start, end] untuk query tanggal YYYY-MM-DD tertentu di WIB.
 */
export function getWIBDateRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);
  return { start, end };
}

// ============================================================
// Haversine distance — meters between two coordinates
// ============================================================
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// ============================================================
// Time progress (0-100) based on start/end date
// ============================================================
export function calculateTimeProgress(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

// ============================================================
// Days remaining until end date
// ============================================================
export function daysRemaining(endDate: string): number {
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ============================================================
// Total duration of internship in days
// ============================================================
export function internshipDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

// ============================================================
// Hitung jumlah hari kerja (Senin-Jumat) antara 2 tanggal (inklusif)
// CATATAN: ini adalah working days MENTAH — belum dikurangi libur nasional.
// Untuk effective working days (sudah dikurangi libur), pakai
// countEffectiveWorkingDays() dari lib/holidays.ts
// ============================================================
export function countWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;
  // Set jam ke 00:00 untuk konsistensi
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay(); // 0=Minggu, 6=Sabtu
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count); // minimal 1 untuk hindari div-by-zero
}

// ============================================================
// Hitung Maksimal EXP Teoritis untuk durasi magang tertentu
//
// RUMUS BARU (post-libur resmi + spare 10%):
//
//   effective_working_days = working_days − libur_nasional_di_weekday − cuti_bersama_di_weekday
//   max_exp_basis = round(effective_working_days × 0.90)  // spare 10% untuk sakit/izin/darurat
//
// Asumsi standar BPJS (rajin absen + 1 tugas/hari + quest mingguan + bonus pembina):
//   - Check-In: 20 EXP per hari kerja efektif
//   - Check-Out: 10 EXP per hari kerja efektif
//   - Tugas standar (1 per hari): 20 EXP per hari kerja efektif
//   - Quest dari chat grup: 20 EXP per minggu (= effective_working_days / 5)
//   - Bonus XP dari pembina (rata-rata): 30 EXP per minggu
//   - Survival Kit quiz (8 modul × 25 EXP): 200 EXP sekali saja
//
// SPARE 10% (justifikasi — berdasarkan riset standar industri):
//   - Pro-rata cuti tahunan (UU 13/2003 Ps.79): 6 hari = 4,7%
//   - Sakit wajar: 3 hari = 2,3%
//   - Izin/darurat keluarga: 2 hari = 1,6%
//   - Buffer tak terduga: 2 hari = 1,6%
//   - Total: ~10% (selaras benchmark EU 7-8% + margin Indonesia)
//
// Sumber: SKB 3 Menteri 2026, EU Directive 2003/88/EC, UU 13/2003
// ============================================================
export function calculateMaxExp(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  // Lazy import untuk hindari circular dependency
  const { countEffectiveWorkingDays } = require('./holidays');
  const effectiveWorkingDays = countEffectiveWorkingDays(startDate, endDate);
  if (effectiveWorkingDays <= 0) return 0;

  // Spare 10% untuk sakit/izin/darurat/cuti pribadi
  const maxExpBasis = Math.round(effectiveWorkingDays * 0.90);

  // Quest & bonus dihitung per minggu (pakai effective, bukan post-spare —
  // karena quest/bonus tetap per minggu kalender kerja, bukan per hari spare)
  const weeks = Math.max(1, Math.floor(effectiveWorkingDays / 5));

  const maxExp =
    maxExpBasis * 50 +        // CI (20) + CO (10) + 1 tugas/hari (20) = 50/hari
    weeks * 20 +              // quest mingguan
    weeks * 30 +              // bonus pembina mingguan (rata-rata)
    200;                      // survival kit (8 modul × 25)
  return maxExp;
}

// ============================================================
// Tier calculation — DINAMIS berdasarkan durasi magang per peserta
//
// Threshold (persentase dari max_exp):
//   - Participation: < 25% max_exp
//   - Competent:     25% - 50% max_exp
//   - Excellence:    >= 50% max_exp
//
// Fallback ke threshold lama (1000/500) kalau start_date/end_date NULL
// (untuk backward compatibility dengan data lama yang belum punya tanggal)
// ============================================================
export function calculateTier(
  exp: number,
  startDate?: string | null,
  endDate?: string | null
): 'Excellence' | 'Competent' | 'Participation' {
  // Fallback: kalau tidak ada tanggal, pakai threshold statis lama
  if (!startDate || !endDate) {
    if (exp >= 1000) return 'Excellence';
    if (exp >= 500) return 'Competent';
    return 'Participation';
  }
  const maxExp = calculateMaxExp(startDate, endDate);
  const pct = maxExp > 0 ? exp / maxExp : 0;
  if (pct >= 0.5) return 'Excellence';
  if (pct >= 0.25) return 'Competent';
  return 'Participation';
}

// ============================================================
// Hitung progress ke tier berikutnya (untuk UI progress bar)
// Returns: { current_tier, next_tier, current_exp, next_tier_exp, max_exp, percentage }
// ============================================================
export function calculateTierProgress(
  exp: number,
  startDate?: string | null,
  endDate?: string | null
): {
  current_tier: 'Excellence' | 'Competent' | 'Participation';
  next_tier: 'Excellence' | 'Competent' | null;
  current_exp: number;
  next_tier_exp: number | null;
  max_exp: number;
  percentage: number;
} {
  const currentTier = calculateTier(exp, startDate, endDate);

  // Fallback statis kalau tidak ada tanggal
  if (!startDate || !endDate) {
    const tiers = [
      { name: 'Participation' as const, min: 0 },
      { name: 'Competent' as const, min: 500 },
      { name: 'Excellence' as const, min: 1000 }
    ];
    const currentIdx = tiers.findIndex(t => t.name === currentTier);
    const nextIdx = currentIdx + 1;
    const nextTier: 'Excellence' | 'Competent' | null = nextIdx < tiers.length ? tiers[nextIdx].name as 'Excellence' | 'Competent' : null;
    return {
      current_tier: currentTier,
      next_tier: nextTier,
      current_exp: exp,
      next_tier_exp: nextTier ? tiers[nextIdx].min : null,
      max_exp: 1000,
      percentage: Math.min(100, Math.round((exp / 1000) * 100))
    };
  }

  // Dinamis berdasarkan max_exp
  const maxExp = calculateMaxExp(startDate, endDate);
  const competentThreshold = Math.round(maxExp * 0.25);
  const excellenceThreshold = Math.round(maxExp * 0.50);

  let nextTier: 'Competent' | 'Excellence' | null = null;
  let nextTierExp: number | null = null;

  if (currentTier === 'Participation') {
    nextTier = 'Competent';
    nextTierExp = competentThreshold;
  } else if (currentTier === 'Competent') {
    nextTier = 'Excellence';
    nextTierExp = excellenceThreshold;
  }
  // Excellence = tier maksimal, tidak ada next

  return {
    current_tier: currentTier,
    next_tier: nextTier,
    current_exp: exp,
    next_tier_exp: nextTierExp,
    max_exp: maxExp,
    percentage: maxExp > 0 ? Math.min(100, Math.round((exp / maxExp) * 100)) : 0
  };
}

// ============================================================
// Level calculation based on EXP
// 100 EXP = Level 2, 250 = Level 3, 450 = Level 4, 700 = Level 5, 1000 = Level 6 (max)
// ============================================================
export function calculateLevel(exp: number): { level: number; current: number; next: number; progress: number } {
  const thresholds = [
    { level: 1, min: 0 },
    { level: 2, min: 100 },
    { level: 3, min: 250 },
    { level: 4, min: 450 },
    { level: 5, min: 700 },
    { level: 6, min: 1000 }
  ];
  let current = thresholds[0];
  let next = thresholds[1];
  for (let i = 0; i < thresholds.length; i++) {
    if (exp >= thresholds[i].min) {
      current = thresholds[i];
      next = thresholds[i + 1] || thresholds[i];
    }
  }
  const progress = next === current ? 100 : Math.round(((exp - current.min) / (next.min - current.min)) * 100);
  return { level: current.level, current: exp, next: next.min, progress };
}

// ============================================================
// Date format helpers (Indonesian)
// ============================================================
const ID_MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const ID_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatDateID(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTimeID(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${ID_DAYS[d.getDay()]}, ${d.getDate()} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()} • ${hh}:${mm} WIB`;
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const yy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// ============================================================
// Verification ID generator (for certificate)
// Format: MC-{year}-{6 random alphanumeric}
// ============================================================
export function generateVerificationId(): string {
  const year = new Date().getFullYear();
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += charset[Math.floor(Math.random() * charset.length)];
  }
  return `MC-${year}-${code}`;
}

// ============================================================
// EXP rewards
// ============================================================
export const EXP_REWARDS = {
  CHECK_IN: 20,
  CHECK_OUT: 10,
  TASK_MICRO_CHUNK: 10,
  TASK_FULL_COMPLETE: 50,
  SURVIVAL_KIT_QUIZ_PASS: 25
} as const;

// ============================================================
// Indonesian Rupiah formatter
// ============================================================
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}
