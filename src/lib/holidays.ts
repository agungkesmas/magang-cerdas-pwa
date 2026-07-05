// ============================================================
// HARI LIBUR INDONESIA — Libur Nasional + Cuti Bersama 2026
//
// Sumber: SKB 3 Menteri No. 1497/2025; No. 2/2025; No. 5/2025
// (Menpan-RB, Menag, Menaker) — ditandatangani Sept 2025
// URL: https://www.kemenkopmk.go.id/sites/default/files/pengumuman/2025-09/SKB%20Libur%20Nasional%20dan%20Cuti%20Bersama%20Tahun%202026.pdf
//
// Total 2026: 17 hari libur nasional + 8 hari cuti bersama = 25 tanggal merah
//
// Kategori:
//   - national: libur nasional resmi (wajib)
//   - collective: cuti bersama (umumnya diikuti BUMN seperti BPJS)
//
// CARA UPDATE TAHUN BERIKUTNYA:
//   1. Tunggu SKB 3 Menteri tahun bersangkutan (biasanya rilis Sept tahun sebelumnya)
//   2. Tambahkan array tahun baru di bawah ini
//   3. Update getHolidays(year) untuk return array tahun tsb
// ============================================================

export interface Holiday {
  date: string;      // YYYY-MM-DD
  name: string;
  type: 'national' | 'collective';
}

// ============================================================
// LIBUR NASIONAL + CUTI BERSAMA 2026
// ============================================================
const HOLIDAYS_2026: Holiday[] = [
  // Januari
  { date: '2026-01-01', name: 'Tahun Baru Masehi', type: 'national' },
  { date: '2026-01-02', name: 'Cuti Bersama Tahun Baru', type: 'collective' },

  // Februari
  { date: '2026-02-17', name: 'Tahun Baru Imlek 2577 Kongzili', type: 'national' },

  // Maret
  { date: '2026-03-03', name: "Isra Mikraj Nabi Muhammad SAW", type: 'national' },
  { date: '2026-03-20', name: 'Hari Suci Nyepi Tahun Baru Saka 1948', type: 'national' },

  // April (Idul Fitri 1447 H — puncak 20-21 April)
  { date: '2026-04-03', name: 'Wafat Isa Al Masih', type: 'national' },
  { date: '2026-04-17', name: 'Cuti Bersama Idul Fitri', type: 'collective' },
  { date: '2026-04-20', name: 'Idul Fitri 1447 H', type: 'national' },
  { date: '2026-04-21', name: 'Idul Fitri 1447 H', type: 'national' },
  { date: '2026-04-22', name: 'Cuti Bersama Idul Fitri', type: 'collective' },
  { date: '2026-04-23', name: 'Cuti Bersama Idul Fitri', type: 'collective' },
  { date: '2026-04-24', name: 'Cuti Bersama Idul Fitri', type: 'collective' },

  // Mei
  { date: '2026-05-01', name: 'Hari Buruh Internasional', type: 'national' },
  { date: '2026-05-20', name: 'Hari Kebangkitan Nasional', type: 'national' },
  { date: '2026-05-29', name: 'Kenaikan Isa Al Masih', type: 'national' },

  // Juni
  { date: '2026-06-01', name: 'Hari Lahir Pancasila', type: 'national' },
  { date: '2026-06-26', name: 'Idul Adha 1447 H', type: 'national' },

  // Juli
  // (Juli 2026 tidak ada libur nasional resmi menurut SKB 3 Menteri)

  // Agustus
  { date: '2026-08-17', name: 'Hari Proklamasi Kemerdekaan RI ke-81', type: 'national' },
  { date: '2026-08-25', name: 'Maulid Nabi Muhammad SAW', type: 'national' },

  // September
  // (tidak ada libur)

  // Oktober
  // (tidak ada libur)

  // November
  // (tidak ada libur)

  // Desember
  { date: '2026-12-24', name: 'Cuti Bersama Hari Raya Natal', type: 'collective' },
  { date: '2026-12-25', name: 'Hari Raya Natal', type: 'national' },
  { date: '2026-12-31', name: 'Cuti Bersama Tahun Baru', type: 'collective' }
];

// ============================================================
// CACHE in-memory untuk performance (hindari re-create array tiap call)
// ============================================================
let cachedHolidaysByYear: Record<number, Holiday[]> = {
  2026: HOLIDAYS_2026
};

// Cache custom holidays dari DB (admin-set, BPJS-specific)
// Format: { 'YYYY-MM-DD': Holiday[] } — bisa multiple per tanggal
let cachedCustomHolidays: Record<string, Holiday[]> = {};
let customHolidaysLoadedAt = 0;
const CUSTOM_HOLIDAYS_TTL_MS = 5 * 60 * 1000; // 5 menit cache

// ============================================================
// GET HOLIDAYS BY YEAR — return libur nasional + cuti bersama
// (tidak include custom holidays — pakai getCustomHolidays untuk itu)
// ============================================================
export function getNationalHolidays(year: number): Holiday[] {
  if (cachedHolidaysByYear[year]) {
    return cachedHolidaysByYear[year];
  }
  // Tahun belum didukung — return empty (admin harus update file ini)
  // Production: sebaiknya log warning
  console.warn(`[holidays] Tahun ${year} belum punya daftar libur. Update src/lib/holidays.ts.`);
  return [];
}

// ============================================================
// SET CUSTOM HOLIDAYS — dipanggil oleh API setelah load dari DB
// (akan auto-cache di memory)
// ============================================================
export function setCustomHolidays(holidays: Holiday[]): void {
  cachedCustomHolidays = {};
  for (const h of holidays) {
    if (!cachedCustomHolidays[h.date]) cachedCustomHolidays[h.date] = [];
    cachedCustomHolidays[h.date].push(h);
  }
  customHolidaysLoadedAt = Date.now();
}

// ============================================================
// GET CUSTOM HOLIDAYS — return cached custom holidays
// (caller harus pastikan setCustomHolidays sudah dipanggil,
//  misalnya via middleware atau di awal API)
// ============================================================
export function getCustomHolidays(): Holiday[] {
  // Check TTL — kalau lebih dari 5 menit, return empty (caller harus reload)
  if (Date.now() - customHolidaysLoadedAt > CUSTOM_HOLIDAYS_TTL_MS) {
    return [];
  }
  return Object.values(cachedCustomHolidays).flat();
}

// ============================================================
// IS HOLIDAY — cek apakah tanggal tertentu adalah hari libur
// (nasional + cuti bersama + custom BPJS)
// ============================================================
export function isHoliday(date: string | Date): boolean {
  const dateStr = typeof date === 'string' ? date.substring(0, 10) : formatDateISO(date);
  const year = parseInt(dateStr.substring(0, 4), 10);

  // Cek libur nasional + cuti bersama
  const national = getNationalHolidays(year);
  if (national.some(h => h.date === dateStr)) return true;

  // Cek custom holidays (BPJS-specific)
  if (cachedCustomHolidays[dateStr] && cachedCustomHolidays[dateStr].length > 0) {
    return true;
  }

  return false;
}

// ============================================================
// GET HOLIDAY INFO — return detail holiday untuk tanggal tertentu
// (atau null kalau bukan libur)
// ============================================================
export function getHolidayInfo(date: string | Date): Holiday | null {
  const dateStr = typeof date === 'string' ? date.substring(0, 10) : formatDateISO(date);
  const year = parseInt(dateStr.substring(0, 4), 10);

  const national = getNationalHolidays(year);
  const found = national.find(h => h.date === dateStr);
  if (found) return found;

  if (cachedCustomHolidays[dateStr] && cachedCustomHolidays[dateStr].length > 0) {
    return cachedCustomHolidays[dateStr][0];
  }

  return null;
}

// ============================================================
// GET HOLIDAYS IN RANGE — return all holidays antara 2 tanggal
// (untuk verifikasi & display)
// ============================================================
export function getHolidaysInRange(startDate: string, endDate: string): Holiday[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const result: Holiday[] = [];

  // Libur nasional + cuti bersama
  const years = new Set<number>();
  const cur = new Date(start);
  while (cur <= end) {
    years.add(cur.getFullYear());
    cur.setFullYear(cur.getFullYear() + 1);
  }

  for (const year of years) {
    const holidays = getNationalHolidays(year);
    for (const h of holidays) {
      const hDate = new Date(h.date);
      if (hDate >= start && hDate <= end) {
        result.push(h);
      }
    }
  }

  // Custom holidays
  for (const h of getCustomHolidays()) {
    const hDate = new Date(h.date);
    if (hDate >= start && hDate <= end) {
      result.push(h);
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================
// COUNT HOLIDAYS IN WEEKDAY — hitung jumlah hari libur yang
// jatuh di hari Senin-Jumat (exclude weekend — karena weekend
// sudah tidak dihitung sebagai working day)
// ============================================================
export function countHolidaysInWeekday(startDate: string, endDate: string): number {
  const holidays = getHolidaysInRange(startDate, endDate);
  let count = 0;
  for (const h of holidays) {
    const day = new Date(h.date).getDay(); // 0=Minggu, 6=Sabtu
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// ============================================================
// COUNT EFFECTIVE WORKING DAYS — hitung hari kerja efektif
// (Senin-Jumat, dikurangi libur nasional + cuti bersama + custom BPJS)
//
// Rumus:
//   working_days_mentah = countWorkingDays(start, end) — Senin-Jumat saja
//   libur_di_weekday = countHolidaysInWeekday(start, end) — libur di Senin-Jumat
//   effective = working_days_mentah − libur_di_weekday
// ============================================================
export function countEffectiveWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay(); // 0=Minggu, 6=Sabtu
    if (day !== 0 && day !== 6) {
      // Cek apakah hari ini libur (nasional/cuti bersama/custom)
      const dateStr = formatDateISO(cur);
      if (!isHoliday(dateStr)) {
        count++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(0, count); // boleh 0 kalau semua hari libur
}

// ============================================================
// FORMAT DATE ISO — helper untuk format Date ke YYYY-MM-DD
// ============================================================
function formatDateISO(d: Date): string {
  const yy = d.getFullYear();
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
