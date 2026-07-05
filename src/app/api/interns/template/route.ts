// ============================================================
// /api/interns/template — Download Excel template for batch intern upload
// Returns: .xlsx file with formatted template + example row + data validation
// ============================================================

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getAdminToken } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Define headers and example rows
    const headers = [
      'Nama*',
      'Jurusan*',
      'Departemen*',
      'Institusi*',
      'TanggalMulai*',
      'TanggalSelesai*',
      'Email',
      'WhatsApp'
    ];

    const exampleRows = [
      ['Budi Santoso', 'Rekayasa Perangkat Lunak', 'Pelayanan', 'SMK Negeri 1 Cirebon', '2026-07-01', '2026-12-31', 'budi@email.com', '081234567890'],
      ['Siti Aminah', 'Akuntansi', 'Keuangan', 'SMK Negeri 1 Cirebon', '2026-07-01', '2026-12-31', 'siti@email.com', '081298765432'],
      ['Andi Wijaya', 'Teknik Komputer Jaringan', 'Pemasaran', 'SMK Negeri 2 Cirebon', '2026-08-01', '2027-01-31', '', '']
    ];

    // Build worksheet data with header + examples
    const wsData = [headers, ...exampleRows];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Nama
      { wch: 28 }, // Jurusan
      { wch: 15 }, // Departemen
      { wch: 25 }, // Institusi
      { wch: 14 }, // TanggalMulai
      { wch: 14 }, // TanggalSelesai
      { wch: 25 }, // Email
      { wch: 15 }  // WhatsApp
    ];

    // Add a "Petunjuk" sheet with instructions
    const petunjukData = [
      ['PETUNJUK PENGISIAN TEMPLATE BATCH PESERTA MAGANG'],
      [''],
      ['Kolom bertanda * wajib diisi.'],
      [''],
      ['1. Nama*', 'Nama lengkap peserta magang (tanpa gelar)'],
      ['2. Jurusan*', 'Jurusan siswa di sekolah, contoh: Rekayasa Perangkat Lunak, Akuntansi, TKJ'],
      ['3. Departemen*', 'Salah satu dari: Pelayanan, Pemasaran, Keuangan (HURUF KAPITAL atau Capitalize)'],
      ['4. Institusi*', 'Nama sekolah asal peserta, contoh: SMK Negeri 1 Cirebon'],
      ['5. TanggalMulai*', 'Format: YYYY-MM-DD, contoh: 2026-07-01'],
      ['6. TanggalSelesai*', 'Format: YYYY-MM-DD, contoh: 2026-12-31'],
      ['7. Email', 'Email peserta (opsional). Jika kosong, sistem abaikan.'],
      ['8. WhatsApp', 'Nomor WA peserta (opsional). Format: 08xxxxxxxxxx'],
      [''],
      ['CATATAN PENTING:'],
      ['- Username dan password akan di-generate otomatis oleh sistem'],
      ['- Setelah upload berhasil, admin dapat download hasil CSV berisi kredensial'],
      ['- Admin juga dapat print kartu kredensial untuk dibagikan ke peserta'],
      ['- Maksimal 100 peserta per upload'],
      ['- Hapus baris contoh (Budi, Siti, Andi) sebelum upload']
    ];
    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
    wsPetunjuk['!cols'] = [{ wch: 25 }, { wch: 70 }];
    wsPetunjuk['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');
    XLSX.utils.book_append_sheet(wb, ws, 'Data Peserta');

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return as downloadable file
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="template-batch-peserta-magang-${new Date().toISOString().split('T')[0]}.xlsx"`,
        'Content-Length': buf.length.toString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
