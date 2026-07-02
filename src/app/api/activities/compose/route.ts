// ============================================================
// /api/activities/compose — AI generate langkah-langkah aktivitas dari judul
// Admin ketik judul singkat → AI generate deskripsi berupa todolist/langkah
// Fallback stub jika LLM tidak tersedia
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAdminToken } from '@/lib/auth';
import { callLLM, LLMMessage } from '@/lib/llm';

const COMPOSE_SYSTEM_PROMPT = `Kamu adalah asisten pembimbing magang di BPJS Ketenagakerjaan Cabang Cirebon.

Tugas: dari JUDUL aktivitas yang singkat, buat deskripsi berupa LANGKAH-LANGKAH konkret yang harus dilakukan peserta magang.

Aturan:
- Bahasa Indonesia, santai tapi jelas (kayak kakak ngomong ke adik kelas)
- Format: poin-poin bernomor (1. 2. 3. dst)
- 3-7 langkah, masing-masing 1-2 kalimat
- Spesifik ke konteks BPJS Ketenagakerjaan (JMO, SMILE, JKK, JKM, JHT, JP, JKP, dll)
- Kalau judul tentang "verifikasi", jelaskan verifikasi APA dan dokumen APA
- Kalau judul tentang "scan", jelaskan scan berkas APA dan urutannya
- Akhiri dengan: "💡 Kalau bingung, tanya kakak pembimbing ya!"
- JANGAN pakai bahasa formal/surat dinas

Contoh input: "Verifikasi dokumen JHT"
Contoh output:
1. Buka aplikasi JMO, login pakai akun magang yang sudah dikasih.
2. Cari antrian klaim JHT hari ini — filter berdasarkan tanggal masuk.
3. Untuk setiap dokumen, cek kelengkapan: KTP, KK, surat pengunduran diri bermeterai, buku tabungan.
4. Cocokkan nama di KTP dengan nama di sistem JMO — kalau beda, flag ke pembimbing.
5. Catat hasil verifikasi di logbook harian kamu.
6. Kalau ada dokumen kurang, hubungi peserta via telepon (nomor di sistem).
💡 Kalau bingung, tanya kakak pembimbing ya!`;

// Stub fallback — rule-based berdasarkan keyword di judul
function getStubComposition(title: string): string {
  const t = title.toLowerCase();

  if (t.includes('verifikasi') || t.includes('verif')) {
    return `1. Buka aplikasi JMO/SMILE yang sudah ditentukan, login pakai akun magang.
2. Cari antrian dokumen yang perlu diverifikasi (filter berdasarkan tanggal hari ini).
3. Untuk setiap dokumen, cek kelengkapan: KTP, KK, surat resmi, buku tabungan, dll.
4. Cocokkan data di dokumen fisik dengan data di sistem — kalau ada beda, catat dan laporkan.
5. Verifikasi tanda tangan & meterai (kalau ada) — pastikan original, bukan fotokopi.
6. Catat hasil verifikasi di logbook harian, tandai dokumen yang lengkap/kurang.
7. Kalau ada dokumen kurang, hubungi peserta atau eskalasi ke pembimbing.
💡 Kalau bingung, tanya kakak pembimbing ya!`;
  }

  if (t.includes('scan') || t.includes('input data') || t.includes('entry')) {
    return `1. Siapkan berkas fisik yang akan discan (urutkan berdasarkan nomor antrian).
2. Nyalakan scanner, pastikan kabel terhubung dan software scan sudah terbuka.
3. Scan setiap berkas — cek hasil scan jelas dan tidak miring (rotate kalau perlu).
4. Save dengan format nama: [Tanggal]_[NoAntrian]_[JenisDokumen].pdf
5. Upload file scan ke folder Google Drive/SharePoint yang sudah ditentukan pembimbing.
6. Input metadata (nama peserta, no BPJS, jenis klaim) ke sistem JMO/SMILE.
7. Arsipkan berkas fisik ke map sesuai kategori, kembalikan ke rak arsip.
💡 Kalau bingung, tanya kakak pembimbing ya!`;
  }

  if (t.includes('pelayanan') || t.includes('customer') || t.includes('front office') || t.includes('loket')) {
    return `1. Datang ke meja pelayanan/loket 15 menit sebelum jam buka.
2. Siapkan alat tulis, form kosong, dan brosur program BPJS Ketenagakerjaan.
3. Sapa peserta dengan ramah: "Selamat pagi, ada yang bisa saya bantu?"
4. Dengarkan kebutuhan peserta, catat di buku tamu (nama, keperluan, no antrian).
5. Kalau bisa bantu langsung, proses segera. Kalau kompleks, arahkan ke petugas terkait.
6. Untuk pertanyaan tentang program, jelaskan pakai bahasa simpel (JHT = tabungan hari tua, dll).
7. Catat feedback peserta — ada yang kurang jelas? Ada keluhan? Laporkan ke pembimbing.
💡 Kalau bingung, tanya kakak pembimbing ya!`;
  }

  if (t.includes('sosialisasi') || t.includes('presentasi') || t.includes('edukasi')) {
    return `1. Siapkan materi: slide/brosur/info grafis tentang program yang akan disosialisasikan.
2. Pahami dulu program-nya (JHT? JKK? JP?) — baca modul Survival Kit bagian BPJS.
3. Datang ke lokasi (kantor cabang/sekolah/UMKM) 15 menit sebelum jadwal.
4. Perkenalkan diri: "Halo, saya [nama] dari BPJS Ketenagakerjaan Cabang Cirebon."
5. Presentasi/sosialisasi pakai bahasa simpel — hindari istilah teknis, pakai analogi.
6. Beri kesempatan tanya jawab, catat pertanyaan yang sering muncul.
7. Bagikan brosur/contact card, ucapkan terima kasih.
💡 Kalau bingung, tanya kakak pembimbing ya!`;
  }

  if (t.includes('rekap') || t.includes('laporan') || t.includes('report') || t.includes('data')) {
    return `1. Buka sistem (JMO/SMILE/Excel) yang berisi data mentah.
2. Tentukan periode laporan (harian? mingguan? bulanan?).
3. Filter data sesuai periode, export ke Excel kalau perlu.
4. Kelompokkan data berdasarkan kategori (jenis program, status, dll).
5. Hitung total, persentase, tren — buat grafik sederhana kalau diminta.
6. Tulis ringkasan eksekutif: apa insight utama dari data ini?
7. Save laporan dengan format: [Periode]_[JenisLaporan].xlsx, kirim ke pembimbing.
💡 Kalau bingung, tanya kakak pembimbing ya!`;
  }

  if (t.includes('arsip') || t.includes('filing') || t.includes('dokumen')) {
    return `1. Kumpulkan semua dokumen yang perlu diarsip (urutkan per kategori).
2. Siapkan map/folder label: JHT, JKK, JKM, JP, JKP, atau per bulan.
3. Untuk setiap dokumen, cek tanggal dan jenis — masukkan ke map yang sesuai.
4. Kalau arsip digital, scan dulu (lihat langkah scan), baru upload ke folder sesuai kategori.
5. Update daftar arsip (Excel/buku catatan): tanggal, jenis, jumlah dokumen, lokasi simpan.
6. Rapikan rak arsip — dokumen lama (lebih dari 1 tahun) bisa dipindahkan ke gudang arsip.
7. Pastikan tidak ada dokumen tercecer di meja — semua harus ada di map/rak.
💡 Kalau bingung, tanya kakak pembimbing ya!`;
  }

  // Default — generic task
  return `1. Pahami dulu tujuan tugas ini — tanya pembimbing kalau tidak jelas.
2. Siapkan alat/bahan yang dibutuhkan (laptop, akun sistem, dokumen, dll).
3. Kerjakan step by step, catat progres di logbook setiap selesai 1 tahap.
4. Kalau nemu kendala, catat dan cari solusi — kalau buntu, tanya pembimbing.
5. Review hasil sebelum submit — cek ulang apakah sudah sesuai instruksi.
6. Submit hasil ke pembimbing, minta feedback.
7. Catat pembelajaran di logbook: apa yang baru kamu pelajari hari ini?
💡 Kalau bingung, tanya kakak pembimbing ya!`;
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminToken();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Judul wajib diisi' }, { status: 400 });
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: COMPOSE_SYSTEM_PROMPT },
      { role: 'user', content: `Judul aktivitas: "${title}"\n\nGenerate langkah-langkah konkret untuk peserta magang.` }
    ];

    try {
      const result = await callLLM(messages);
      if (result.text && result.text.length > 20) {
        return NextResponse.json({
          success: true,
          description: result.text.trim(),
          source: 'llm' as const,
          provider: result.provider,
          model: result.model,
          latencyMs: result.latencyMs
        });
      }
      throw new Error('Empty AI response');
    } catch (aiErr: any) {
      // Fallback ke stub
      const stubDesc = getStubComposition(title);
      return NextResponse.json({
        success: true,
        description: stubDesc,
        source: 'stub' as const,
        note: aiErr.message
      });
    }
  } catch (e: any) {
    console.error('[activities/compose] error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
