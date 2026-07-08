// ============================================================
// /api/bkk/parse-excel — BKK parse uploaded Excel/CSV → JSON
// Sama seperti admin parse-excel tapi auth BKK
// School_origin auto-set dari sekolah BKK
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getBKKToken } from '@/lib/auth';

const VALID_DEPARTMENTS = ['Pelayanan', 'Pemasaran', 'Keuangan'];

function normalizeDept(raw: any): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toLowerCase();
  if (s === 'pelayanan') return 'Pelayanan';
  if (s === 'pemasaran') return 'Pemasaran';
  if (s === 'keuangan') return 'Keuangan';
  if (s.includes('pelay')) return 'Pelayanan';
  if (s.includes('pemas')) return 'Pemasaran';
  if (s.includes('keu')) return 'Keuangan';
  return null;
}

function normalizeDate(raw: any): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().split('T')[0];
  const s = String(raw).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const bkk = await getBKKToken();
    if (!bkk) {
      return NextResponse.json({ error: 'Unauthorized — BKK only' }, { status: 401 });
    }

    if (!bkk.schools || bkk.schools.length === 0) {
      return NextResponse.json({ error: 'Akun BKK belum di-link ke sekolah' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'File Excel/CSV wajib diupload' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    // Auto-set school_origin dari sekolah BKK
    const defaultSchool = bkk.schools.length === 1 ? bkk.schools[0] : '';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const defaultEnd = new Date(Date.now() + 90 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const interns = rows.map((row: any) => {
      const name = String(row['Nama'] || row['Name'] || row['nama'] || '').trim();
      const major = String(row['Jurusan'] || row['Major'] || row['jurusan'] || '').trim();
      const deptRaw = row['Departemen'] || row['Department'] || row['departemen'] || '';
      const department = normalizeDept(deptRaw);
      const startDate = normalizeDate(row['Tanggal Mulai'] || row['Start Date'] || row['start_date']) || today;
      const endDate = normalizeDate(row['Tanggal Selesai'] || row['End Date'] || row['end_date']) || defaultEnd;
      const email = String(row['Email'] || row['email'] || '').trim() || undefined;
      const whatsapp = String(row['WhatsApp'] || row['WA'] || row['whatsapp'] || '').trim() || undefined;
      // School: kalau BKK bimbing 1 sekolah, auto-set. Kalau >1, BKK pilih di form.
      const schoolOrigin = bkk.schools.length === 1 ? bkk.schools[0] : (String(row['Sekolah'] || row['School'] || row['sekolah'] || '').trim() || '');

      return { name, major, department, school_origin: schoolOrigin, start_date: startDate, end_date: endDate, email, whatsapp };
    }).filter(r => r.name); // filter empty rows

    // Validate
    const errors: string[] = [];
    interns.forEach((r, i) => {
      if (!r.major) errors.push(`Baris ${i + 2}: Jurusan kosong`);
      if (!r.department) errors.push(`Baris ${i + 2}: Departemen tidak valid (gunakan: Pelayanan, Pemasaran, Keuangan)`);
      if (!r.school_origin) errors.push(`Baris ${i + 2}: Sekolah kosong (pilih dari: ${bkk.schools.join(', ')})`);
      if (r.school_origin && !bkk.schools.includes(r.school_origin)) errors.push(`Baris ${i + 2}: Sekolah "${r.school_origin}" tidak termasuk sekolah yang Anda bimbing`);
    });

    return NextResponse.json({
      success: true,
      interns,
      errors,
      available_schools: bkk.schools,
      total_rows: rows.length,
      valid_rows: interns.length
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
