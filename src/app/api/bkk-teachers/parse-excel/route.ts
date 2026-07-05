// ============================================================
// /api/bkk-teachers/parse-excel — Parse uploaded Excel/CSV → JSON array
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAdminToken } from '@/lib/auth';

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

    let sheetName = wb.SheetNames[0];
    if (wb.SheetNames.includes('Data BKK')) sheetName = 'Data BKK';
    const ws = wb.Sheets[sheetName];
    if (!ws) return NextResponse.json({ error: 'Worksheet tidak ditemukan' }, { status: 400 });

    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) {
      return NextResponse.json({ error: 'File kosong atau tidak ada baris data' }, { status: 400 });
    }

    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      if (rows[i].some((c) => String(c).toLowerCase().includes('nama'))) {
        headerRowIdx = i;
        break;
      }
    }

    const headers = rows[headerRowIdx].map((h) => String(h || '').trim().toLowerCase());
    const findCol = (patterns: string[]): number => {
      for (let i = 0; i < headers.length; i++) {
        if (patterns.some((p) => headers[i].includes(p))) return i;
      }
      return -1;
    };

    const colNama = findCol(['nama']);
    const colEmail = findCol(['email']);
    const colSekolah = findCol(['sekolah', 'institusi', 'asal']);
    const colPhone = findCol(['telepon', 'phone', 'telp', 'hp', 'wa', 'whatsapp']);

    if (colNama === -1) {
      return NextResponse.json({ error: 'Kolom "Nama" tidak ditemukan' }, { status: 400 });
    }

    const teachers: any[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => !String(c || '').trim())) continue;

      const name = String(row[colNama] || '').trim();
      if (!name) continue;
      if (['dewi lestari', 'rudi hartono', 'maya sari'].includes(name.toLowerCase())) continue;

      const email = colEmail >= 0 ? String(row[colEmail] || '').trim() : '';
      const sekolahRaw = colSekolah >= 0 ? String(row[colSekolah] || '').trim() : '';
      const phone = colPhone >= 0 ? String(row[colPhone] || '').trim() : '';

      if (!email) {
        errors.push({ row: i + 1, message: 'Email wajib diisi' });
        continue;
      }
      if (!sekolahRaw) {
        errors.push({ row: i + 1, message: 'Sekolah wajib diisi' });
        continue;
      }

      // Parse multi-school (comma-separated)
      const schoolNames = sekolahRaw.split(',').map((s) => s.trim()).filter(Boolean);

      teachers.push({ name, email, school_names: schoolNames, phone });
    }

    if (teachers.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris valid.', errors }, { status: 400 });
    }
    if (teachers.length > 100) {
      return NextResponse.json({ error: `Maksimal 100 BKK per upload (${teachers.length} diberikan)`, errors }, { status: 400 });
    }

    return NextResponse.json({ success: true, teachers, errors, total: teachers.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
