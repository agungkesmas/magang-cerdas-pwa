// ============================================================
// /api/interns/parse-excel — Parse uploaded Excel/CSV file → JSON array
// POST (multipart/form-data with file field)
// Returns: { interns: [{ name, major, department, school_origin, start_date, end_date, email, whatsapp }] }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAdminToken } from '@/lib/auth';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan'];

// Normalize department (case-insensitive)
function normalizeDept(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'pelayanan') return 'Pelayanan';
  if (s === 'pemasaran') return 'Pemasaran';
  if (s === 'keuangan') return 'Keuangan';
  // Partial match
  if (s.includes('pelayanan')) return 'Pelayanan';
  if (s.includes('pemasaran')) return 'Pemasaran';
  if (s.includes('keuangan')) return 'Keuangan';
  return null;
}

function normalizeDate(raw: any): string | null {
  if (!raw) return null;
  // If it's a number (Excel serial date), convert
  if (typeof raw === 'number') {
    // Excel serial date: days since 1900-01-01 (with leap bug)
    const utcDays = Math.floor(raw - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  const s = String(raw).trim();
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m1) {
    const [_, d, mo, y] = m1;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try Date parse
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'File wajib diupload' }, { status: 400 });
    }

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });

    // Pick the right sheet: prefer "Data Peserta" if exists, else first
    let sheetName = wb.SheetNames[0];
    if (wb.SheetNames.includes('Data Peserta')) sheetName = 'Data Peserta';
    const ws = wb.Sheets[sheetName];

    if (!ws) return NextResponse.json({ error: 'Worksheet tidak ditemukan' }, { status: 400 });

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) {
      return NextResponse.json({ error: 'File kosong atau tidak ada baris data' }, { status: 400 });
    }

    // Find header row (first row containing "Nama" or similar)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i].some((c) => String(c).toLowerCase().includes('nama'))) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = rows[headerRowIdx].map((h) => String(h || '').trim().toLowerCase());

    // Find column indices by header name
    const findCol = (patterns: string[]): number => {
      for (let i = 0; i < headers.length; i++) {
        const h = headers[i];
        if (patterns.some((p) => h.includes(p))) return i;
      }
      return -1;
    };

    const colNama = findCol(['nama']);
    const colJurusan = findCol(['jurusan']);
    const colDept = findCol(['departemen', 'department', 'dept']);
    const colInstitusi = findCol(['institusi', 'sekolah', 'asal']);
    const colStart = findCol(['tanggalmulai', 'mulai', 'start', 'awal']);
    const colEnd = findCol(['tanggalselesai', 'selesai', 'end', 'akhir']);
    const colEmail = findCol(['email']);
    const colWa = findCol(['whatsapp', 'wa', 'telepon', 'telp', 'hp']);

    if (colNama === -1) {
      return NextResponse.json({ error: 'Kolom "Nama" tidak ditemukan pada header' }, { status: 400 });
    }

    const interns: any[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => !String(c || '').trim())) continue; // skip empty

      const name = String(row[colNama] || '').trim();
      if (!name) continue; // skip empty name

      // Skip example rows that contain "Budi Santoso" / "Siti Aminah" / "Andi Wijaya"
      if (['budi santoso', 'siti aminah', 'andi wijaya'].includes(name.toLowerCase())) continue;

      const major = colJurusan >= 0 ? String(row[colJurusan] || '').trim() : '';
      const deptRaw = colDept >= 0 ? row[colDept] : '';
      const dept = normalizeDept(deptRaw);
      const institusi = colInstitusi >= 0 ? String(row[colInstitusi] || '').trim() : '';
      const startRaw = colStart >= 0 ? row[colStart] : '';
      const endRaw = colEnd >= 0 ? row[colEnd] : '';
      const email = colEmail >= 0 ? String(row[colEmail] || '').trim() : '';
      const wa = colWa >= 0 ? String(row[colWa] || '').trim() : '';

      const startDate = normalizeDate(startRaw) || new Date().toISOString().split('T')[0];
      const endDate = normalizeDate(endRaw) || new Date(Date.now() + 90 * 86400 * 1000).toISOString().split('T')[0];

      // Validate department
      if (!dept) {
        errors.push({ row: i + 1, message: `Departemen tidak valid: "${deptRaw}". Harus salah satu: Pelayanan, Pemasaran, Keuangan` });
        continue;
      }

      // Validate dates
      if (new Date(endDate) < new Date(startDate)) {
        errors.push({ row: i + 1, message: `Tanggal selesai (${endDate}) sebelum tanggal mulai (${startDate})` });
        continue;
      }

      interns.push({
        name,
        major: major || 'Umum',
        department: dept,
        school_origin: institusi || '',
        start_date: startDate,
        end_date: endDate,
        email: email || '',
        whatsapp: wa || ''
      });
    }

    if (interns.length === 0) {
      return NextResponse.json({
        error: 'Tidak ada baris valid. Pastikan minimal 1 baris berisi nama + departemen yang valid.',
        errors
      }, { status: 400 });
    }

    if (interns.length > 100) {
      return NextResponse.json({
        error: `Terlalu banyak baris (${interns.length}). Maksimal 100 peserta per upload.`,
        errors
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, interns, errors, total: interns.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
