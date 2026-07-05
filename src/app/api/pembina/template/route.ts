// ============================================================
// /api/pembina/template — Download Excel template for batch pembina upload
// ============================================================

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const headers = ['Nama*', 'Email*', 'Departemen*', 'Telepon'];
    const exampleRows = [
      ['Ahmad Fauzi', 'ahmad.fauzi@bpjs-ketenagakerjaan.go.id', 'Pelayanan', '081234567890'],
      ['Siti Rahayu', 'siti.rahayu@bpjs-ketenagakerjaan.go.id', 'Pemasaran', '081298765432'],
      ['Budi Hartono', 'budi.hartono@bpjs-ketenagakerjaan.go.id', 'Keuangan', '']
    ];

    const wsData = [headers, ...exampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }];

    const petunjukData = [
      ['PETUNJUK PENGISIAN TEMPLATE BATCH PEMBINA MAGANG'],
      [''],
      ['Kolom bertanda * wajib diisi.'],
      [''],
      ['1. Nama*', 'Nama lengkap pembina (staff BPJTK)'],
      ['2. Email*', 'Email pembina — harus unik. Format: nama@domain.com'],
      ['3. Departemen*', 'Salah satu dari: Pelayanan, Pemasaran, Keuangan, Lintas Bidang'],
      ['4. Telepon', 'Nomor telepon pembina (opsional). Format: 08xxxxxxxxxx'],
      [''],
      ['CATATAN PENTING:'],
      ['- ID Pembina (PB-XXXX) dan password akan di-generate otomatis'],
      ['- Pembina baru otomatis di-link ke grup departemen yang sesuai (kecuali Lintas Bidang)'],
      ['- Setelah upload, admin bisa print kartu kredensial untuk dibagikan ke pembina'],
      ['- Maksimal 100 pembina per upload'],
      ['- Hapus baris contoh (Ahmad, Siti, Budi) sebelum upload']
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
    wsPetunjuk['!cols'] = [{ wch: 25 }, { wch: 70 }];
    wsPetunjuk['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
    XLSX.utils.book_append_sheet(wb, ws, 'Data Pembina');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-batch-pembina-magang-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buf.length.toString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
