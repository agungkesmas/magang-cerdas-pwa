// ============================================================
// /api/bkk-teachers/template — Download Excel template for batch BKK upload
// ============================================================

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const headers = ['Nama*', 'Email*', 'Sekolah*', 'Telepon'];
    const exampleRows = [
      ['Dewi Lestari', 'dewi.lestari@smkn1cirebon.sch.id', 'SMK Negeri 1 Cirebon', '081234567890'],
      ['Rudi Hartono', 'rudi.hartono@smkn2cirebon.sch.id', 'SMK Negeri 2 Cirebon', '081298765432'],
      ['Maya Sari', 'maya.sari@smkalhidayah.sch.id', 'SMK Al Hidayah', '']
    ];

    const wsData = [headers, ...exampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 30 }, { wch: 15 }];

    const petunjukData = [
      ['PETUNJUK PENGISIAN TEMPLATE BATCH GURU BKK'],
      [''],
      ['Kolom bertanda * wajib diisi.'],
      [''],
      ['1. Nama*', 'Nama lengkap guru BKK'],
      ['2. Email*', 'Email guru BKK — harus unik. Format: nama@sekolah.sch.id'],
      ['3. Sekolah*', 'Nama sekolah. Jika sekolah belum terdaftar, sistem otomatis membuat.'],
      ['              ', 'Pisahkan dengan koma untuk multi-sekolah, contoh: SMK Negeri 1, SMK Al Hidayah'],
      ['4. Telepon', 'Nomor telepon BKK (opsional). Format: 08xxxxxxxxxx'],
      [''],
      ['CATATAN PENTING:'],
      ['- ID BKK (BKK-XXXX) dan password akan di-generate otomatis'],
      ['- Setelah upload, admin bisa print kartu kredensial untuk dibagikan ke guru BKK'],
      ['- Maksimal 100 BKK per upload'],
      ['- Hapus baris contoh (Dewi, Rudi, Maya) sebelum upload']
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
    wsPetunjuk['!cols'] = [{ wch: 25 }, { wch: 70 }];
    wsPetunjuk['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
    XLSX.utils.book_append_sheet(wb, ws, 'Data BKK');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-batch-guru-bkk-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buf.length.toString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
