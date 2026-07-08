// ============================================================
// /api/bkk/template — Download template Excel khusus BKK
// Bedanya dengan admin template: TIDAK ada kolom Departemen
// (departemen ditentukan admin, bukan BKK)
// ============================================================

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getBKKToken } from '@/lib/auth';

export async function GET() {
  try {
    const bkk = await getBKKToken();
    if (!bkk) {
      return NextResponse.json({ error: 'Unauthorized — BKK only' }, { status: 401 });
    }

    // Template data — tanpa kolom Departemen
    const templateData = [
      {
        'Nama': 'Contoh: Andi Pratama',
        'Jurusan': 'Contoh: AKL',
        'Tanggal Mulai': '2026-07-08',
        'Tanggal Selesai': '2026-10-06',
        'Email': 'andi@email.com',
        'WhatsApp': '0812-3456-7890',
        ...(bkk.schools.length > 1 ? { 'Sekolah': bkk.schools[0] || '' } : {})
      },
      {
        'Nama': 'Contoh: Siti Rahma',
        'Jurusan': 'Contoh: TKJ',
        'Tanggal Mulai': '2026-07-08',
        'Tanggal Selesai': '2026-10-06',
        'Email': 'siti@email.com',
        'WhatsApp': '0813-9876-5432',
        ...(bkk.schools.length > 1 ? { 'Sekolah': bkk.schools[0] || '' } : {})
      }
    ];

    // Add instruction row
    const instructions = [
      { 'Nama': '=== PETUNJUK ===', 'Jurusan': '', 'Tanggal Mulai': '', 'Tanggal Selesai': '', 'Email': '', 'WhatsApp': '' },
      { 'Nama': '1. Isi nama lengkap siswa', 'Jurusan': '4. Format tanggal: YYYY-MM-DD', 'Tanggal Mulai': '', 'Tanggal Selesai': '', 'Email': '', 'WhatsApp': '' },
      { 'Nama': '2. Isi jurusan siswa', 'Jurusan': '5. Email & WhatsApp opsional', 'Tanggal Mulai': '', 'Tanggal Selesai': '', 'Email': '', 'WhatsApp': '' },
      { 'Nama': '3. Hapus baris contoh & petunjuk', 'Jurusan': '6. Departemen ditentukan ADMIN', 'Tanggal Mulai': '', 'Tanggal Selesai': '', 'Email': '', 'WhatsApp': '' },
    ];

    const ws = XLSX.utils.json_to_sheet([...instructions, ...templateData]);
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Nama
      { wch: 15 }, // Jurusan
      { wch: 15 }, // Tanggal Mulai
      { wch: 15 }, // Tanggal Selesai
      { wch: 25 }, // Email
      { wch: 18 }, // WhatsApp
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Peserta');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-batch-peserta-magang-bkk-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
