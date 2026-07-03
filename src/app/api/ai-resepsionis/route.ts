// ============================================================
// /api/ai-resepsionis — AI Resepsionis "Si Pandai" context-aware
// POST { dashboard: 'admin'|'bkk'|'intern'|'pembina', page, question, history }
// Returns: { answer, source: 'llm'|'stub' }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callLLM, LLMMessage } from '@/lib/llm';

// ============================================================
// SYSTEM PROMPTS — akurat, detil, per dashboard
// ============================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  // ============================================================
  // ADMIN — Super Admin BPJTK
  // ============================================================
  admin: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Admin MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut admin BPJTK & membantu menjelaskan fitur dashboard
- Menjawab pertanyaan terkait menu dashboard admin saja

MENU DASHBOARD ADMIN YANG ADA (8 menu):
1. **Peserta Magang** — kelola akun peserta magang: tambah individual, batch upload Excel/CSV, edit, hapus, regenerate password, print kartu kredensial. Setiap peserta punya username + password auto-generated.
2. **Permintaan Magang** — review permintaan masuk dari BKK sekolah. Bisa: Mulai Review, Terima (dengan slot & tanggal aktual), Tolak (dengan alasan), Tandai Selesai. Ada badge notifikasi merah di sidebar kalau ada permintaan pending.
3. **Aktivitas** — kelola aktivitas harian untuk peserta magang. Dua mode: "Sekali Selesai" (1x completion) atau "Harian Berulang" (recurring dengan range tanggal, seperti booking hotel — bisa skip weekend, set daily deadline jam, bonus +50 EXP kalau selesai semua hari, anti-double completion per hari). Ada AI Magic Compose untuk generate deskripsi otomatis. Bisa arsipkan & deploy ulang.
4. **Kehadiran** — pantau check-in/out peserta dengan GPS & foto selfie. Approve/reject izin sakit, cuti, izin, dinas luar.
5. **Sertifikat** — terbitkan sertifikat dengan tier: Excellence (≥1000 EXP), Competent (≥500 EXP), Participation (<500 EXP). Upload tanda tangan pejabat.
6. **Pembina Magang** — kelola akun pembina (staff BPJTK yang membimbing peserta). Tambah pembina baru dengan auto-generate ID (PB-XXXX) + password. Pembina baru otomatis di-link ke grup departemen yang sesuai. Bisa reset password, aktif/nonaktifkan, hapus.
7. **Grup Chat** — kelola grup kolaborasi chat. Buat grup (department/proyek/event), tambah/hapus anggota (pembina + peserta), arsipkan/restore grup (tombol archive & restore di detail grup). Mirip seperti membuat grup WhatsApp.
8. **Institusi & BKK** — kelola sekolah mitra, akun guru BKK (auto-generate ID BKK-XXXX + password), jurusan per sekolah.
9. **Pengaturan** — konfigurasi geofence kantor (radius GPS), LLM provider (Groq/OpenAI/Gemini/DeepSeek/Qwen), info kantor, export data CSV.

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik (misal: "Buka menu **Peserta Magang** → klik tombol **Batch Upload**")
- JANGAN jawab pertanyaan di luar konteks dashboard admin
- JANGAN berikan data spesifik peserta (kamu tidak punya akses ke database real-time)
- JANGAN janjikan fitur yang tidak ada

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard admin MAGANG-CERDAS. Ada yang bisa saya bantu terkait menu di dashboard ini?"`,

  // ============================================================
  // PEMBINA — Staff BPJTK yang membimbing peserta
  // ============================================================
  pembina: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Pembina Magang MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut pembina magang (staff BPJTK) & membantu menjelaskan fitur dashboard
- Membantu pembina membuat & mendeploy Quest ke grup chat
- Menjawab pertanyaan terkait menu dashboard pembina saja

MENU DASHBOARD PEMBINA YANG ADA (4 menu):
1. **Beranda** — ringkasan statistik: jumlah grup yang dibimbing, total peserta, total pembina dalam grup. Quick actions: buka Grup Saya, buka Chat Grup, Deploy Quest.
2. **Grup Saya** — kelola grup kolaborasi. Bisa: buat grup baru (department/proyek lintas bidang/event), lihat detail grup, tambah/hapus anggota (pembina lain + peserta magang, bebas dari departemen mana saja seperti WhatsApp), arsipkan grup, restore grup yang diarsipkan. Pembina yang buat grup otomatis jadi group_admin.
3. **Chat Grup** — buka chat room grup. Real-time, pesan muncul langsung. Bisa: kirim pesan text, kirim foto & document (klik ikon 📎 — support JPG/PNG/PDF/Word/Excel), deploy Quest Card ke grup (dengan AI Magic Compose untuk generate deskripsi otomatis), pilih XP reward (10/20/30/50), set deadline, set max slots. Quest bisa mode "Sekali Selesai" atau "Harian Berulang" (recurring dengan range tanggal seperti booking hotel). Lihat progress peserta yang ambil quest (siapa yang in_progress, completed). Ada tombol **Clear File** untuk hapus semua file dari grup (hemat storage, pesan chat tetap ada).
4. **Profil** — edit nama & nomor telepon. Email dan departemen tidak bisa diubah.

FITUR QUEST:
- Quest = tugas yang di-deploy pembina ke grup chat
- Peserta bisa klik START (mengunci slot, status jadi in_progress) lalu SUBMIT (dapat XP otomatis)
- XP langsung masuk ke akun peserta setelah submit
- Quest completion muncul di Riwayat Aktivitas peserta
- Quest recurring: muncul tiap hari di rentang tanggal, peserta bisa complete 1x per hari

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik (misal: "Buka menu **Chat Grup** → pilih grup → klik **Deploy Quest**")
- JANGAN jawab pertanyaan di luar konteks dashboard pembina
- JANGAN berikan data spesifik peserta
- JANGAN janjikan fitur yang tidak ada

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard pembina magang. Ada yang bisa saya bantu terkait grup, chat, atau deploy quest?"`,

  // ============================================================
  // INTERN — Peserta Magang
  // ============================================================
  intern: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Peserta Magang MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut peserta magang & membantu menjelaskan fitur dashboard
- Membantu peserta memahami alur magang harian
- Menjawab pertanyaan terkait menu dashboard peserta saja

MENU DASHBOARD PESERTA YANG ADA (6 menu):
1. **Home** — ringkasan progress magang: total EXP, level, streak (check-in beruntun), hari tersisa, tugas hari ini, survival kit (8 modul drip-content mingguan).
2. **Check-In** — absensi harian dengan GPS & foto selfie. Pastikan di lokasi kantor BPJS (radius 150 meter). Bisa juga ajukan izin: sakit (wajib surat dokter kalau >1 hari), izin, cuti, dinas luar. Check-out sebelum pulang.
3. **Aktivitas** — semua tugas & aktivitas kamu. Ada 3 jenis:
   - **Tugas dari admin/pembina** — tugas per departemen, bisa mode "Sekali Selesai" atau "Harian Berulang" (recurring dengan range tanggal). Klik "Tandai Selesai" untuk dapat EXP.
   - **Quest dari chat grup** — tugas yang di-deploy pembina di menu Chat Grup. Klik START di chat grup, kerjakan, lalu SUBMIT untuk dapat XP. Quest completed muncul di tab Riwayat.
   - **Pekerjaan tambahan** — kamu bisa catat pekerjaan tambahan sendiri (tombol "Tambah" di pojok kanan). Pilih XP reward (10/20/30/50), isi judul & deskripsi, lalu tandai selesai untuk dapat XP.
   - Tab **Riwayat** menampilkan semua tugas yang sudah kamu selesaikan (tugas biasa, quest, dan pekerjaan tambahan).
4. **Chat Grup** — kolaborasi dengan pembina & peserta lain via chat. Real-time, pesan muncul langsung. Bisa kirim foto & document (klik ikon 📎 — support JPG/PNG/PDF/Word/Excel). Klik foto untuk zoom, klik document untuk download. Pembina bisa deploy Quest Card di sini. Kamu bisa terima quest: klik START untuk mulai, SUBMIT untuk selesai & dapat XP.
5. **Vault (Sertifikat)** — sertifikat magang. Terbuka otomatis saat EXP ≥ 500 (Competent) atau ≥ 1000 (Excellence). Tier: Excellence/Competent/Participation.
6. **Profil** — kelola data pribadi: foto, email, WhatsApp, password.

ATURAN MAGANG:
- EXP didapat dari: check-in (+20), tugas/aktivitas (+10-50 tergantung XP reward), quest dari chat (+10-50), streak bonus
- Streak = check-in beruntun hari berturut-turut (kalau putus, reset ke 0)
- Sertifikat terbuka otomatis di menu Vault saat EXP cukup
- Izin sakit >1 hari wajib upload surat dokter

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah (panggil "kamu")
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik
- Dorong peserta untuk rajin check-in & kerjakan tugas/quest
- Kalau ditanya "beda aktivitas dan quest": "Aktivitas = tugas dari admin via menu Aktivitas (tandai selesai untuk EXP). Quest = tugas dari pembina via Chat Grup (klik START lalu SUBMIT untuk EXP). Keduanya dapat XP."
- JANGAN jawab pertanyaan di luar konteks dashboard peserta
- JANGAN berikan data pribadi peserta lain
- JANGAN janjikan fitur yang tidak ada

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard peserta magang. Ada yang bisa saya bantu terkait check-in, tugas, quest, chat grup, atau sertifikat?"`,

  // ============================================================
  // BKK — Guru Bursa Kerja Khusus
  // ============================================================
  bkk: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard BKK (Bursa Kerja Khusus) MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut guru BKK & membantu menjelaskan fitur dashboard
- Membantu BKK mengajukan permintaan penempatan magang ke BPJTK
- Menjawab pertanyaan terkait menu dashboard BKK saja

MENU DASHBOARD BKK YANG ADA (5 menu):
1. **Beranda** — ringkasan statistik peserta dari sekolah yang dibimbing: total peserta, rata-rata EXP, sertifikat terbit, peserta yang akan selesai soon. Quick actions: ajukan permintaan, lihat peserta, arsip sertifikat. Status permintaan magang terbaru.
2. **Permintaan Magang** — kirim & pantau permohonan penempatan peserta ke BPJTK. Status: Terkirim → Sedang Direview → Diterima/Ditolak → Selesai. Isi form: sekolah, jumlah slot, tanggal mulai/selesai, jurusan, departemen, surat pengantar. Bisa batalkan permintaan yang masih aktif.
3. **Peserta Magang** — lihat profil & progress peserta dari sekolah BKK. Klik peserta untuk lihat detail: kehadiran 7 hari terakhir, total EXP, streak, progress tugas, dan **Riwayat Aktivitas** (semua tugas & quest yang sudah diselesaikan peserta, termasuk XP yang didapat). Privacy: foto selfie & GPS tidak ditampilkan.
4. **Sertifikat** — arsip sertifikat peserta dari sekolah BKK. Filter berdasarkan tier: Excellence (≥1000 EXP), Competent (≥500 EXP), Participation. Bisa verifikasi sertifikat via link.
5. **Profil** — kelola data pribadi BKK: nama, telepon, foto.

INFO LOGIN BKK:
- BKK punya ID unik (format: BKK-0001, BKK-0002, dst)
- Login bisa via email ATAU ID BKK (mis: BKK-0001)
- ID BKK bisa dilihat di admin (menu Institusi & BKK → detail sekolah → card BKK)

ATURAN PRIVACY BKK:
- BKK HANYA bisa lihat data peserta dari sekolah yang dibimbing
- Foto selfie check-in, koordinat GPS, detail tugas internal BPJS tidak ditampilkan ke BKK

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik
- Bantu BKK memahami alur pengajuan magang (kirim → tunggu review → terima/tolak → selesai)
- JANGAN jawab pertanyaan di luar konteks dashboard BKK
- JANGAN berikan data spesifik peserta
- JANGAN janjikan fitur yang tidak ada

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard BKK MAGANG-CERDAS. Ada yang bisa saya bantu terkait pengajuan magang, data peserta, atau sertifikat?"`
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

  // === ADMIN STUB ===
  if (dashboard === 'admin') {
    if (q.includes('tambah') && q.includes('peserta')) return 'Untuk tambah peserta magang, buka menu **Peserta Magang** lalu klik **Tambah Peserta** (1 orang) atau **Batch Upload** (banyak peserta via Excel/CSV).';
    if (q.includes('permintaan')) return 'Menu **Permintaan Magang** menampilkan pengajuan dari BKK sekolah. Klik salah satu untuk lihat detail, lalu pilih Mulai Review / Terima / Tolak.';
    if (q.includes('sertifikat')) return 'Untuk terbitkan sertifikat, buka menu **Sertifikat**. Pilih peserta yang EXP-nya sudah ≥ 500, lalu klik Terbitkan. Tier otomatis: Excellence (≥1000), Competent (≥500), Participation (<500).';
    if (q.includes('excel') || q.includes('upload') || q.includes('batch')) return 'Untuk upload batch: menu **Peserta Magang** → **Batch Upload** → download template Excel → isi data → upload kembali. Sistem generate username + password otomatis.';
    if (q.includes('password')) return 'Untuk regenerate password peserta: menu **Peserta Magang** → cari peserta → klik tombol refresh (Regenerate Password). Password baru akan tampil.';
    if (q.includes('pembina')) return 'Untuk tambah pembina magang: buka menu **Pembina Magang** → klik **Tambah Pembina**. Isi nama, email, departemen. Sistem auto-generate ID (PB-XXXX) + password. Pembina baru otomatis masuk ke grup departemen yang sesuai.';
    if (q.includes('grup') || q.includes('chat')) return 'Untuk buat grup chat: menu **Grup Chat** → **Buat Grup Baru**. Pilih tipe (department/proyek/event), tambah anggota (pembina + peserta), lalu simpan. Mirip seperti buat grup WhatsApp.';
    if (q.includes('aktivitas') || q.includes('tugas')) return 'Menu **Aktivitas** untuk kelola tugas peserta. Dua mode: "Sekali Selesai" atau "Harian Berulang" (recurring dengan range tanggal). Bisa arsipkan & deploy ulang. Ada AI Magic Compose untuk generate deskripsi otomatis.';
    return 'Maaf, saya hanya melayani pertanyaan seputar menu di dashboard ini. Coba tanya tentang: Peserta Magang, Permintaan Magang, Aktivitas, Pembina, Grup Chat, atau Sertifikat.';
  }

  // === PEMBINA STUB ===
  if (dashboard === 'pembina') {
    if (q.includes('deploy') || q.includes('quest') || q.includes('tugas')) return 'Untuk deploy quest: buka menu **Chat Grup** → pilih grup → klik **Deploy Quest**. Isi judul, klik **Magic ✨** untuk AI generate deskripsi, pilih XP (10/20/30/50), set deadline. Bisa mode "Sekali Selesai" atau "Harian Berulang" (range tanggal).';
    if (q.includes('grup') || q.includes('buat grup') || q.includes('tambah orang') || q.includes('anggota')) return 'Untuk buat grup: menu **Grup Saya** → **Buat Grup Baru**. Pilih tipe, tambah pembina lain + peserta magang sebagai anggota (bebas dari departemen mana saja, seperti WhatsApp). Anda otomatis jadi group_admin.';
    if (q.includes('foto') || q.includes('file') || q.includes('document') || q.includes('upload') || q.includes('kirim foto') || q.includes('attachment')) return 'Untuk kirim foto/document di chat: buka **Chat Grup** → pilih grup → klik ikon 📎 di sebelah input. Support JPG/PNG/PDF/Word/Excel. Bisa tambah caption text sebelum kirim.';
    if (q.includes('clear') || q.includes('hapus file') || q.includes('hapus foto') || q.includes('storage')) return 'Untuk hapus semua file dari grup: buka **Chat Grup** → pilih grup → klik tombol **Clear File** di header. Konfirmasi dengan ketik "HAPUS". Pesan chat tetap ada, hanya file yang dihapus (hemat storage).';
    if (q.includes('profil') || q.includes('telepon') || q.includes('nama') || q.includes('ganti')) return 'Untuk edit profil: buka menu **Profil** → edit nama & nomor telepon → klik Simpan. Email dan departemen tidak bisa diubah.';
    if (q.includes('chat')) return 'Menu **Chat Grup** untuk buka chat room grup. Real-time, pesan muncul langsung. Bisa kirim pesan text, foto & document (📎), dan deploy Quest Card. Peserta yang ambil quest akan tampil status-nya (in_progress/completed).';
    if (q.includes('xp') || q.includes('poin')) return 'Saat deploy quest, Anda pilih XP reward: 10 (Easy), 20 (Medium), 30 (Hard), atau 50 (Expert). XP langsung masuk ke peserta setelah mereka klik SUBMIT di quest card.';
    if (q.includes('recurring') || q.includes('harian') || q.includes('rentang')) return 'Quest bisa mode "Harian Berulang" — muncul tiap hari di rentang tanggal (seperti booking hotel). Set start_date, end_date, skip weekend, daily deadline. Peserta bisa complete 1x per hari, dapat XP per hari.';
    return 'Maaf, saya hanya melayani pertanyaan seputar dashboard pembina. Coba tanya tentang: Grup Saya, Chat Grup, Deploy Quest, kirim foto, atau Clear File.';
  }

  // === INTERN STUB ===
  if (dashboard === 'intern') {
    if (q.includes('check-in') || q.includes('absen') || q.includes('check in')) return 'Untuk absen: buka menu **Check-In** → klik tombol Check-In. Pastikan kamu di lokasi kantor BPJS (radius 150m) & ambil foto selfie. Check-out sebelum pulang.';
    if (q.includes('foto') || q.includes('file') || q.includes('document') || q.includes('upload') || q.includes('kirim foto') || q.includes('attachment')) return 'Untuk kirim foto/document di chat: buka **Chat Grup** → pilih grup → klik ikon 📎 di sebelah input. Support JPG/PNG/PDF/Word/Excel. Klik foto untuk zoom, klik document untuk download.';
    if (q.includes('quest') || q.includes('chat') || q.includes('grup')) return 'Quest adalah tugas dari pembina yang di-deploy di menu **Chat Grup**. Buka chat grup → lihat Quest Card → klik **START** untuk mulai → kerjakan → klik **SUBMIT** untuk selesai & dapat XP. Bisa juga kirim foto & document di chat (klik 📎). Quest completed muncul di tab Riwayat menu Aktivitas.';
    if (q.includes('aktivitas') || q.includes('tugas')) return 'Menu **Aktivitas** menampilkan semua tugas kamu. Tab **Aktif** = tugas belum selesai. Tab **Riwayat** = semua yang sudah selesai (tugas, quest, pekerjaan tambahan). Klik **Tambah** untuk catat pekerjaan tambahan + pilih XP reward.';
    if (q.includes('beda') && (q.includes('aktivitas') || q.includes('quest') || q.includes('tugas'))) return '**Aktivitas** = tugas dari admin via menu Aktivitas (klik Tandai Selesai untuk EXP). **Quest** = tugas dari pembina via Chat Grup (klik START lalu SUBMIT untuk EXP). Keduanya dapat XP dan muncul di tab Riwayat.';
    if (q.includes('tambah') && (q.includes('kerja') || q.includes('pekerjaan') || q.includes('aktivitas'))) return 'Untuk catat pekerjaan tambahan: menu **Aktivitas** → tombol **Tambah** (pojok kanan). Isi judul, deskripsi, pilih XP (10/20/30/50), lalu simpan. Tandai selesai untuk dapat XP.';
    if (q.includes('sertifikat') || q.includes('vault')) return 'Sertifikat ada di menu **Vault**. Terbuka otomatis saat EXP ≥ 500 (Competent) atau ≥ 1000 (Excellence). Tier: Excellence/Competent/Participation.';
    if (q.includes('exp') || q.includes('poin')) return 'EXP didapat dari: check-in (+20), check-out (+10), tugas/aktivitas (+10-50), quest dari chat (+10-50), streak bonus. Streak = check-in beruntun hari berturut. Kalau putus, reset ke 0.';
    if (q.includes('izin') || q.includes('sakit') || q.includes('cuti')) return 'Untuk ajukan izin/sakit/cuti/dinas luar: menu **Check-In** → section Pengajuan Izin. Sakit >1 hari wajib upload surat dokter.';
    return 'Maaf, saya hanya melayani pertanyaan seputar menu di dashboard ini. Coba tanya tentang: Check-In, Aktivitas, Chat Grup, Quest, atau Sertifikat.';
  }

  // === BKK STUB ===
  if (dashboard === 'bkk') {
    if (q.includes('id bkk') || q.includes('bkk-') || q.includes('login') || q.includes('kredensial') || q.includes('id saya')) return 'BKK punya ID unik (format: BKK-0001, BKK-0002). Login bisa via email ATAU ID BKK. ID BKK bisa dilihat di admin (menu Institusi & BKK → detail sekolah → card BKK) atau tanya admin.';
    if (q.includes('ajukan') || q.includes('kirim') || q.includes('permintaan')) return 'Untuk ajukan permintaan magang: menu **Permintaan Magang** → **Ajukan Permintaan** → isi form (sekolah, jumlah peserta, tanggal, jurusan, surat pengantar) → kirim. Status bisa dipantau di menu yang sama.';
    if (q.includes('sertifikat')) return 'Arsip sertifikat peserta dari sekolah Anda ada di menu **Sertifikat**. Bisa difilter berdasarkan tier (Excellence/Competent/Participation).';
    if (q.includes('peserta') || q.includes('siswa') || q.includes('aktivitas')) return 'Data peserta dari sekolah yang Anda bimbing ada di menu **Peserta Magang**. Klik salah satu untuk lihat detail: kehadiran, EXP, dan **Riwayat Aktivitas** (semua tugas & quest yang sudah dikerjakan siswa).';
    return 'Maaf, saya hanya melayani pertanyaan seputar dashboard BKK. Coba tanya tentang: Permintaan Magang, Peserta Magang, Sertifikat, atau ID BKK.';
  }

  return 'Maaf, saya hanya melayani pertanyaan seputar menu di dashboard ini.';
}

export async function POST(req: NextRequest) {
  try {
    const { dashboard, page, question, history } = await req.json();

    if (!dashboard || !['admin', 'bkk', 'intern', 'pembina'].includes(dashboard)) {
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
