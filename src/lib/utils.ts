// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
// Tier calculation based on EXP
// ============================================================
export function calculateTier(exp: number): 'Excellence' | 'Competent' | 'Participation' {
  if (exp >= 1000) return 'Excellence';
  if (exp >= 500) return 'Competent';
  return 'Participation';
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
