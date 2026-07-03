// ============================================================
// /api/ai-resepsionis — AI Resepsionis context-aware untuk dashboard
// POST { dashboard: 'admin'|'bkk'|'intern', page: string, question: string, history: [] }
// Returns: { answer: string, source: 'llm'|'stub' }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callLLM, LLMMessage } from '@/lib/llm';

// ============================================================
// SYSTEM PROMPTS — context-aware per dashboard
// Bahasa: Indonesian, simple, profesional, ramah
// Tolak pertanyaan di luar konteks dashboard
// ============================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  admin: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Admin MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut admin BPJTK & membantu menjelaskan fitur dashboard
- Menjawab pertanyaan terkait menu dashboard admin saja

MENU DASHBOARD ADMIN YANG ADA:
1. Peserta Magang — kelola akun peserta (tambah individual, batch upload Excel/CSV, edit, hapus, regenerate password, print kartu kredensial)
2. Permintaan Magang — review permintaan masuk dari BKK sekolah (mulai review, terima dengan slot & tanggal, tolak dengan alasan, tandai selesai)
3. Aktivitas — kelola aktivitas harian untuk peserta magang per departemen
4. Kehadiran — pantau check-in/out peserta, approve/reject izin sakit/cuti/dinas luar
5. Sertifikat — terbitkan sertifikat dengan tier (Excellence/Competent/Participation), upload tanda tangan pejabat
6. Institusi & BKK — kelola sekolah mitra, akun guru BKK, jurusan per sekolah
7. Pengaturan — konfigurasi geofence kantor, LLM provider (Groq/OpenAI/Gemini/DeepSeek/Qwen), info kantor

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Fokus menjawab "bagaimana cara" / "di mana" / "apa itu" terkait fitur dashboard
- Sebut nama menu jika perlu (misal: "Buka menu Peserta Magang → klik tombol Batch Upload")
- JANGAN jawab pertanyaan di luar konteks dashboard admin magang (politik, hobi, cuaca, dll) — tolak dengan sopan
- JANGAN berikan data spesifik peserta (karena kamu tidak punya akses ke database real-time)
- JANGAN janjikan fitur yang tidak ada

CONTOH JAWABAN:
- "Halo! Untuk menambah peserta magang, buka menu **Peserta Magang** lalu klik tombol **Tambah Peserta** (untuk 1 peserta) atau **Batch Upload** (untuk banyak peserta via Excel)."
- "Menu **Permintaan Magang** menampilkan pengajuan dari BKK sekolah. Klik permintaan untuk lihat detail, lalu pilih Terima/Tolak/Setujui."
- "Maaf, saya hanya bisa membantu pertanyaan seputar dashboard admin MAGANG-CERDAS. Untuk hal lain, silakan hubungi tim IT BPJS Ketenagakerjaan."

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard admin MAGANG-CERDAS. Ada yang bisa saya bantu terkait menu di dashboard ini?"`,

  bkk: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard BKK (Bursa Kerja Khusus) MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut guru BKK & membantu menjelaskan fitur dashboard
- Membantu BKK mengajukan permintaan penempatan magang ke BPJTK
- Menjawab pertanyaan terkait menu dashboard BKK saja

MENU DASHBOARD BKK YANG ADA:
1. Beranda — ringkasan statistik peserta dari sekolah yang dibimbing, quick actions, status permintaan magang
2. Permintaan Magang — kirim & pantau permohonan penempatan peserta ke BPJTK (status: Terkirim → Direview → Diterima/Ditolak → Selesai)
3. Peserta Magang — lihat profil & progress peserta dari sekolah BKK (kehadiran, EXP, aktivitas, sertifikat)
4. Sertifikat — arsip sertifikat peserta dari sekolah BKK (filter tier: Excellence/Competent/Participation)

6. Profil — kelola data pribadi BKK (nama, telepon, foto)

ATURAN PRIVACY BKK:
- BKK HANYA bisa lihat data peserta dari sekolah yang dibimbing
- Foto selfie check-in, koordinat GPS, detail tugas internal BPJS tidak ditampilkan ke BKK

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Fokus menjawab "bagaimana cara" / "di mana" / "apa itu" terkait fitur dashboard BKK
- Bantu BKK memahami alur pengajuan magang (kirim → tunggu review → terima/tolak → selesai)
- JANGAN jawab pertanyaan di luar konteks dashboard BKK (politik, hobi, dll) — tolak dengan sopan
- JANGAN berikan data spesifik peserta
- JANGAN janjikan fitur yang tidak ada

CONTOH JAWABAN:
- "Halo! Untuk mengajukan permintaan magang, buka menu **Permintaan Magang** lalu klik **Ajukan Permintaan**. Isi jumlah peserta, tanggal, jurusan, dan surat pengantar."
- "Status permintaan Anda: **Terkirim** (menunggu review admin BPJTK). Anda bisa lihat di menu Permintaan Magang."
- "Sertifikat peserta bisa dilihat di menu **Sertifikat**. Filter berdasarkan tier (Excellence/Competent/Participation) tersedia."
- "Maaf, saya hanya bisa membantu pertanyaan seputar dashboard BKK MAGANG-CERDAS. Untuk hal lain, silakan hubungi admin BPJS Ketenagakerjaan."

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard BKK MAGANG-CERDAS. Ada yang bisa saya bantu terkait pengajuan magang atau data peserta?"`,

  intern: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Peserta Magang MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut peserta magang & membantu menjelaskan fitur dashboard
- Membantu peserta memahami alur magang harian (check-in, tugas, aktivitas, sertifikat)
- Menjawab pertanyaan terkait menu dashboard peserta saja

MENU DASHBOARD PESERTA YANG ADA:
1. Home — ringkasan progress magang (EXP, level, streak, hari tersisa), tugas hari ini, survival kit
2. Check-In — absensi harian dengan GPS & foto selfie, ajukan izin sakit/cuti/dinas luar
3. Aktivitas — tugas harian per departemen dengan AI Magic Compose (instruksi personal sesuai jurusan)

5. Vault (Sertifikat) — sertifikat magang yang terbuka setelah capai ≥500 EXP, tier Excellence/Competent/Participation
6. Profil — kelola data pribadi (foto, email, WhatsApp, password)

ATURAN MAGANG:
- EXP didapat dari check-in (+10), tugas (+20-50), aktivitas tambahan (+10-50), dll
- Streak = check-in beruntun hari berturut-turut
- Sertifikat terbuka otomatis saat EXP ≥ 500 (Competent) atau ≥ 1000 (Excellence)
- Survival Kit: 8 modul drip-content (1 modul per minggu)
- Izin sakit >1 hari wajib surat dokter

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah (panggil "kamu")
- Maksimal 3-4 kalimat per jawaban
- Fokus menjawab "bagaimana cara" / "di mana" / "apa itu" terkait fitur dashboard peserta
- Dorong peserta untuk rajin check-in & kerjakan tugas
- JANGAN jawab pertanyaan di luar konteks dashboard peserta magang (politik, hobi, dll) — tolak dengan sopan
- JANGAN berikan data pribadi peserta lain
- JANGAN janjikan fitur yang tidak ada

CONTOH JAWABAN:
- "Halo! Untuk absen harian, buka menu **Check-In** lalu klik tombol Check-In. Pastikan kamu di lokasi kantor BPJS (radius 150 meter) dan ambil foto selfie ya."
- "EXP kamu naik dengan: check-in harian (+10 EXP), kerjakan tugas di menu Aktivitas (+50 EXP), kerjakan aktivitas (+10-50 EXP). Streak check-in beruntun juga bonus!"
- "Sertifikat akan terbuka otomatis di menu **Vault** saat EXP kamu mencapai 500 (Competent) atau 1000 (Excellence)."
- "Maaf, saya hanya bisa membantu pertanyaan seputar dashboard peserta magang. Untuk hal lain, silakan tanya kakak pembimbingmu."

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard peserta magang MAGANG-CERDAS. Ada yang bisa saya bantu terkait check-in, tugas, aktivitas, atau sertifikat?"`
};

// ============================================================
// STUB fallback (rule-based) — when no API key configured
// ============================================================
function stubAnswer(dashboard: string, question: string): string {
  const q = question.toLowerCase();
  const greetings = ['halo', 'hai', 'hello', 'hi', 'assalam', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam'];
  if (greetings.some((g) => q.includes(g))) {
    return 'Halo! Saya Si Pandai, AI Resepsionis MAGANG-CERDAS. Ada yang bisa saya bantu terkait menu di dashboard ini?';
  }
  if (q.includes('terima kasih') || q.includes('makasih') || q.includes('thanks')) {
    return 'Sama-sama! Senang bisa membantu. Jika ada pertanyaan lain, jangan ragu tanya ya.';
  }
  if (dashboard === 'admin') {
    if (q.includes('tambah') && q.includes('peserta')) return 'Untuk tambah peserta magang, buka menu **Peserta Magang** lalu klik **Tambah Peserta** (1 orang) atau **Batch Upload** (banyak peserta via Excel/CSV).';
    if (q.includes('permintaan')) return 'Menu **Permintaan Magang** menampilkan pengajuan dari BKK sekolah. Klik salah satu untuk lihat detail, lalu pilih Mulai Review / Terima / Tolak.';
    if (q.includes('sertifikat')) return 'Untuk terbitkan sertifikat, buka menu **Sertifikat**. Pilih peserta yang EXP-nya sudah ≥ 500, lalu klik Terbitkan. Tier otomatis: Excellence (≥1000), Competent (≥500), Participation (<500).';
    if (q.includes('excel') || q.includes('upload')) return 'Untuk upload batch: menu **Peserta Magang** → **Batch Upload** → download template Excel → isi data → upload kembali. Sistem akan generate username + password otomatis.';
    if (q.includes('password')) return 'Untuk regenerate password peserta: menu **Peserta Magang** → cari peserta → klik tombol refresh (Regenerate Password). Password baru akan tampil.';
  }
  if (dashboard === 'bkk') {
    if (q.includes('ajukan') || q.includes('kirim') || q.includes('permintaan')) return 'Untuk ajukan permintaan magang: menu **Permintaan Magang** → **Ajukan Permintaan** → isi form (sekolah, jumlah peserta, tanggal, jurusan, surat pengantar) → kirim. Status bisa dipantau di menu yang sama.';
    if (q.includes('sertifikat')) return 'Arsip sertifikat peserta dari sekolah Anda ada di menu **Sertifikat**. Bisa difilter berdasarkan tier (Excellence/Competent/Participation).';
    if (q.includes('peserta') || q.includes('siswa')) return 'Data peserta dari sekolah yang Anda bimbing ada di menu **Peserta Magang**. Klik salah satu untuk lihat detail kehadiran, EXP, aktivitas, dan sertifikat.';
    if (q.includes('logbook')) return 'Catatan aktivitas peserta bisa dilihat di menu **Peserta Magang** → detail → tab Riwayat Aktivitas. Anda bisa lihat semua tugas yang sudah dikerjakan siswa.';
  }
  if (dashboard === 'intern') {
    if (q.includes('check-in') || q.includes('absen') || q.includes('check in')) return 'Untuk absen: buka menu **Check-In** → klik tombol Check-In. Pastikan kamu di lokasi kantor BPJS (radius 150m) & ambil foto selfie. Check-out sebelum pulang.';
    if (q.includes('tugas') || q.includes('aktivitas')) return 'Tugas harian ada di menu **Aktivitas**. Klik tugas untuk lihat instruksi (AI Magic Compose personal sesuai jurusan). Kerjakan & tandai selesai untuk dapat EXP.';
    if (q.includes('logbook')) return 'Aktivitas tambahan bisa dicatat di menu **Aktivitas** → tombol Tambah. Pilih XP reward, isi judul Logbook harian diisi di menu **Logbook**. Tulis aktivitas, pembelajaran, & kendala hari ini. +20 EXP per entri. deskripsi, lalu tandai selesai untuk dapat XP.';
    if (q.includes('sertifikat') || q.includes('vault')) return 'Sertifikat ada di menu **Vault**. Terbuka otomatis saat EXP ≥ 500 (Competent) atau ≥ 1000 (Excellence).';
    if (q.includes('exp') || q.includes('poin')) return 'EXP didapat dari: check-in (+10), tugas (+20-50), aktivitas tambahan (+10-50), streak bonus. Streak = check-in beruntun hari berturut.';
    if (q.includes('izin') || q.includes('sakit') || q.includes('cuti')) return 'Untuk ajukan izin/sakit/cuti/dinas luar: menu **Check-In** → section Pengajuan Izin. Sakit >1 hari wajib upload surat dokter.';
  }
  return 'Maaf, saya hanya melayani pertanyaan seputar menu di dashboard ini. Coba tanya tentang: Peserta Magang, Permintaan Magang, Check-In, Aktivitas, atau Sertifikat.';
}

export async function POST(req: NextRequest) {
  try {
    const { dashboard, page, question, history } = await req.json();

    if (!dashboard || !['admin', 'bkk', 'intern'].includes(dashboard)) {
      return NextResponse.json({ error: 'dashboard tidak valid' }, { status: 400 });
    }
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'question wajib diisi' }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json({ error: 'Pertanyaan terlalu panjang (maks 500 karakter)' }, { status: 400 });
    }

    const systemPrompt = SYSTEM_PROMPTS[dashboard];

    // Build messages
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add history (last 4 turns max)
    if (Array.isArray(history)) {
      const recent = history.slice(-4);
      for (const h of recent) {
        if (h.role === 'user' || h.role === 'assistant') {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }

    // Add context about current page (silent context, not shown to user)
    const pageContext = page ? `\n\n[Konteks: User sedang di halaman "${page}"]` : '';
    messages.push({ role: 'user', content: question + pageContext });

    // Try LLM call, fallback to stub
    try {
      const res = await callLLM(messages);
      if (res.text && res.text.length > 5) {
        return NextResponse.json({
          success: true,
          answer: res.text,
          source: 'llm',
          provider: res.provider,
          model: res.model,
          latencyMs: res.latencyMs
        });
      }
      throw new Error('Empty LLM response');
    } catch (llmErr: any) {
      // Fallback to stub
      const stub = stubAnswer(dashboard, question);
      return NextResponse.json({
        success: true,
        answer: stub,
        source: 'stub',
        note: 'LLM tidak tersedia, jawaban default'
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
