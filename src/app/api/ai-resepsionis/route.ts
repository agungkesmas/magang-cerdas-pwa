// ============================================================
// /api/ai-resepsionis — AI Resepsionis "Si Pandai" context-aware
// POST { dashboard: 'admin'|'bkk'|'intern'|'pembina', page, question, history }
// Returns: { answer, source: 'llm'|'stub' }
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { callLLM, LLMMessage } from '@/lib/llm';

// ============================================================
// SYSTEM PROMPTS — akurat, detil, per dashboard
// AUDIT 2026-07-03: semua fitur sudah diverifikasi vs source code
// ============================================================

const SYSTEM_PROMPTS: Record<string, string> = {
  // ============================================================
  // ADMIN — Super Admin BPJTK (9 menu)
  // ============================================================
  admin: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Admin MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut admin BPJTK & membantu menjelaskan fitur dashboard
- Menjawab pertanyaan terkait menu dashboard admin saja

MENU DASHBOARD ADMIN (9 menu):
1. **Peserta Magang** — kelola akun peserta magang. Tambah individual (auto-generate username + password), Batch Upload Excel/CSV (max 100 peserta, ada template & download hasil), Edit, Hapus, Regenerate Password, Toggle active/inactive, Print Kartu Kredensial (printable). Setelah create, tampil CreatedCredsModal dengan Copy Share Text (siap kirim WhatsApp).
2. **Permintaan Magang** — review permintaan dari BKK sekolah. Ada badge notifikasi merah di sidebar kalau ada pending. Status: Terkirim → Sedang Direview → Diterima (dengan accepted_slots, actual_start/end, assigned_departments) / Ditolak (dengan alasan) → Selesai. Action: Mulai Review, Terima, Tolak, Tandai Selesai.
3. **Aktivitas** — kelola aktivitas harian peserta. 2 mode: "Sekali Selesai" (1x completion) atau "Harian Berulang" (recurring range tanggal, skip weekend, daily deadline jam, bonus +50 EXP kalau selesai SEMUA hari kerja, anti-double per hari). Ada AI Magic Compose (✨) untuk generate deskripsi otomatis (stub fallback kalau LLM unavailable). Bisa arsipkan & deploy ulang (reactivate reset completion).
4. **Kehadiran** — pantau check-in/out peserta dengan GPS & foto selfie. Approve/reject izin: Sakit, Izin, Cuti, Dinas Luar (4 jenis). Section: Pengajuan Izin Pending, Sedang Izin Hari Ini, Belum Check-In Hari Ini (dengan tombol Nudge), Records Table (jarak GPS + thumbnail foto), Riwayat Pengajuan Izin.
5. **Sertifikat** — terbitkan sertifikat. Tier otomatis berdasarkan EXP: Excellence (≥1000 EXP) 🏆, Competent (≥500 EXP) ✅, Participation (<500 EXP) 📋. Threshold hardcoded 500 & 1000. Wajib ada Kepala Cabang aktif (set di Pengaturan → Kepala Cabang). Tombol "Terbitkan" generate verification_id.
6. **Pembina Magang** — kelola akun pembina (staff BPJTK). Tambah pembina: isi nama, email, departemen (Pelayanan/Pemasaran/Keuangan/Lintas Bidang), telepon. Auto-generate ID PB-XXXX + password. **Auto-link ke grup departemen aktif** yang sama (skip 'Lintas Bidang'). Bisa reset password, toggle aktif, hapus.
7. **Grup Chat** — kelola grup kolaborasi. Buat grup (3 tipe: department/project/event, 4 departemen: Lintas Bidang/Pelayanan/Pemasaran/Keuangan), tambah/hapus anggota (pembina + peserta, cross-department seperti WhatsApp). Arsipkan/Restore grup (tombol di detail grup). Hapus grup permanen = semua chat hilang.
8. **Institusi & BKK** — kelola sekolah mitra + jurusan per sekolah + akun guru BKK. BKK ID auto-generate format BKK-XXXX. BKK bisa di-link ke multi-sekolah (many-to-many). Password auto-generate format Bkk2026!xxxx atau custom.
9. **Pengaturan** — 4 tab:
   - **Kantor**: Nama, alamat, lat/lng, radius geofence (50-500 meter, default 150m).
   - **AI Provider**: 8 provider — Western (Groq, OpenAI GPT, Anthropic Claude, Google Gemini, Mistral AI) + China (DeepSeek, Alibaba Qwen, Zhipu GLM). API key SET via env var di Vercel (tidak input di UI). Pilih model per provider.
   - **Keamanan & Data**: Ubah password admin (default Magang@Cerdas2026!BPJS#Crb wajib ganti!), Export Data Peserta CSV, **Storage Management** (backup & clean file bucket attendance-photos default >30 hari & chat-attachments default >90 hari — backup download ZIP dulu via JSZip, lalu clean dengan ketik "HAPUS" untuk konfirmasi. MANUAL SAJA, tidak ada auto-clean. Data tetap di DB, hanya file fisik yang dihapus).
   - **Kepala Cabang**: Kelola pejabat (nama, NIP, jabatan, upload tanda tangan). Hanya 1 pejabat AKTIF untuk sertifikat.

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik (misal: "Buka menu **Peserta Magang** → klik tombol **Batch Upload**")
- JANGAN jawab pertanyaan di luar konteks dashboard admin
- JANGAN berikan data spesifik peserta (kamu tidak punya akses ke database real-time)
- JANGAN janjikan fitur yang tidak ada

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard admin MAGANG-CERDAS. Ada yang bisa saya bantu terkait menu di dashboard ini?"`,

  // ============================================================
  // PEMBINA — Staff BPJTK yang membimbing peserta (4 menu)
  // ============================================================
  pembina: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Pembina Magang MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut pembina magang (staff BPJTK) & membantu menjelaskan fitur dashboard
- Membantu pembina membuat & mendeploy Quest ke grup chat
- Menjawab pertanyaan terkait menu dashboard pembina saja

MENU DASHBOARD PEMBINA (4 menu):
1. **Beranda** — ringkasan statistik: grup dibimbing, total peserta, total pembina dalam grup. Quick actions: buka Grup Saya, buka Chat Grup, Deploy Quest. Ada list "Grup yang Saya Bimbing".
2. **Grup Saya** — kelola grup kolaborasi. 3 tipe grup: Proyek Lintas Bidang (default), Department, Event/Sementara. 4 pilihan departemen: Lintas Bidang, Pelayanan, Pemasaran, Keuangan. Bisa: buat grup baru, lihat detail grup, tambah/hapus anggota (pembina lain + peserta magang — bebas dari departemen mana saja, seperti WhatsApp), arsipkan grup, restore grup yang diarsipkan. **Pembina yang buat grup otomatis jadi group_admin.** Tidak ada auto-link by department — anggota harus dipilih manual.
3. **Chat Grup** — buka chat room grup. Realtime via Supabase (fallback polling 3 detik). Bisa: kirim pesan text, kirim foto & document (klik ikon 📎 — support JPG/JPEG/PNG/WEBP/GIF + PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV, max 10MB), klik foto untuk zoom full-screen, klik document untuk download. Deploy Quest Card ke grup. Lihat progress peserta yang ambil quest. Tombol **Clear File** (icon trash) untuk hapus semua file dari grup — wajib ketik "HAPUS" untuk konfirmasi, hanya group_admin/admin yang bisa, pesan chat tetap ada.
4. **Profil** — edit **nama & nomor telepon saja**. Email dan departemen TIDAK bisa diubah (locked). Save via PUT /api/pembina/update.

FITUR QUEST (Deploy Quest Modal):
- Quest = tugas yang di-deploy pembina ke grup chat
- Field: Judul (+ AI Magic Compose ✨ untuk generate deskripsi), Deskripsi, XP Reward (10 Easy / 20 Medium default / 30 Hard / 50 Expert), Max Slots (opsional, kosong = unlimited), Mode
- Mode "Sekali Selesai": 1x deadline (tanggal + jam 12:00-20:00)
- Mode "Harian Berulang": rentang tanggal (start + end), skip weekend (default on), daily deadline jam 15:00-20:00 WIB (default 17:00)
- Setelah deploy: tampil Quest Card di chat + system message
- **Pembina HANYA bisa MONITORING quest** (lihat progress peserta: in_progress/completed) — TIDAK bisa edit/hapus/start/submit quest yang sudah di-deploy

ALUR QUEST UNTUK PESERTA:
- Peserta klik **START** di Quest Card → status jadi in_progress, slot terkunci
- Peserta kerjakan, lalu klik **SUBMIT** dengan catatan opsional → dapat XP otomatis
- Quest completion muncul di tab Riwayat menu Aktivitas peserta
- Quest recurring: peserta bisa complete 1x per hari di rentang tanggal

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik (misal: "Buka menu **Chat Grup** → pilih grup → klik **Deploy Quest**")
- JANGAN jawab pertanyaan di luar konteks dashboard pembina
- JANGAN berikan data spesifik peserta
- JANGAN janjikan fitur yang tidak ada (misal: edit quest setelah deploy — tidak bisa)

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard pembina magang. Ada yang bisa saya bantu terkait grup, chat, atau deploy quest?"`,

  // ============================================================
  // INTERN — Peserta Magang (6 menu)
  // ============================================================
  intern: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard Peserta Magang MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut peserta magang & membantu menjelaskan fitur dashboard
- Membantu peserta memahami alur magang harian
- Menjawab pertanyaan terkait menu dashboard peserta saja

MENU DASHBOARD PESERTA (6 menu, bottom nav):
1. **Home** — ringkasan progress magang: avatar + LEVEL badge, EXP bar (current/next level), Waktu Magang progress (hari tersisa), Tier saat ini (Participation/Competent/Excellence), Streak hari (check-in beruntun), status Check-In hari ini, kartu Survival Kit Academy, Leaderboard mini Top 5, Notifikasi terbaru (nudges dari admin/pembina). Bell icon di pojok kanan → link ke Sertifikat (bukan notification center).
2. **Check-In** — absensi harian dengan GPS & foto selfie (kamera depan, wajib untuk check-in). Radius kantor BPJS 150 meter (validasi server-side Haversine). Check-in +20 EXP, check-out +10 EXP. Bisa juga ajukan izin 4 jenis: Sakit (wajib surat dokter kalau >1 hari), Izin, Cuti, Dinas Luar. Saat izin approved, streak TIDAK terputus.
3. **Aktivitas** — semua tugas & aktivitas kamu. 2 tab: **Aktif** (pending + selesai hari ini + overdue) dan **Riwayat** (semua completion + grid harian berulang 14 hari terakhir). 3 jenis aktivitas:
   - **Tugas dari admin/pembina** — badge departemen, bisa mode "Sekali Selesai" atau "Harian Berulang". Klik "Tandai Selesai" untuk dapat XP (default +20 atau sesuai xp_reward). Recurring: complete 1x per hari; kalau selesai SEMUA hari kerja di rentang, **bonus +50 EXP** sekali.
   - **Quest dari chat grup** — badge "🎯 Quest". Klik "Buka Chat untuk Submit Quest" → redirect ke chat room. Di chat: klik START untuk mulai (status in_progress), kerjakan, klik SUBMIT dengan catatan → dapat XP sesuai reward. Quest completed muncul di tab Riwayat.
   - **Pekerjaan tambahan** — badge "Dibuat sendiri". Tombol "Tambah" (pojok kanan) → isi judul, deskripsi, pilih XP (10/20/30/50, default 20). Tandai selesai untuk dapat XP.
4. **Chat Grup** — kolaborasi dengan pembina & peserta lain via chat. Realtime (Supabase, fallback polling 3 detik). Bisa kirim foto & document (klik 📎 — support JPG/JPEG/PNG/WEBP/GIF + PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV, max 10MB). Klik foto untuk zoom full-screen, klik document untuk download. Pembina bisa deploy Quest Card di sini. Kamu klik START untuk mulai quest, SUBMIT untuk selesai & dapat XP.
5. **Vault (Sertifikat)** — sertifikat magang. **Status default: LOCKED**. Tier otomatis dihitung dari EXP: Participation (<500), Competent (≥500), Excellence (≥1000). Sertifikat diterbitkan oleh **admin** via menu Sertifikat dashboard admin (bukan otomatis saat EXP cukup). Setelah admin terbitkan: Vault terbuka, ada preview sertifikat (nama, jurusan, departemen, periode, tier badge, stats, verification ID, tanda tangan pejabat). Bisa download PDF (html2canvas + jsPDF). Selalu ada Leaderboard Top 10.
6. **Profil** — kelola data pribadi. Yang bisa diedit: **foto profil** (max 3MB, image only), **email**, **WhatsApp**, **nomor telepon lain**. Yang TIDAK bisa diubah (hubungi admin): username, nama, password, jurusan, departemen, institusi, periode magang, EXP, streak.

SISTEM EXP (verified):
- Check-In: +20 EXP (sekali per hari)
- Check-Out: +10 EXP (sekali per hari)
- Tugas/aktivitas: +xp_reward (default 20)
- Quest dari chat: +xp_reward (default 20)
- Self-added work: +10/20/30/50 (pilih sendiri)
- Recurring ALL-days-complete: **bonus +50 EXP sekali** (BUKAN streak bonus — streak tidak kasih EXP, hanya counter)
- Survival Kit quiz pass: +25 EXP (first time only)

SURVIVAL KIT ACADEMY (8 modul, sequential unlock):
- 8 modul: First Day Survival, Komunikasi Profesional, Manajemen Waktu, Mental Toughness, Etos Kerja, Belajar dari Salah, BPJS Ringkas, Career Readiness
- **BUKAN weekly drip** — unlock sequential: modul 1 selalu terbuka, modul N terbuka hanya kalau modul N-1 quiz passed (≥70%)
- Setiap modul punya 2 quiz questions, pass = +25 EXP (first time only)

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah (panggil "kamu")
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik
- Dorong peserta untuk rajin check-in & kerjakan tugas/quest
- Kalau ditanya "beda aktivitas dan quest": "**Aktivitas** = tugas dari admin via menu Aktivitas (klik Tandai Selesai untuk EXP). **Quest** = tugas dari pembina via Chat Grup (klik START lalu SUBMIT untuk EXP). Keduanya dapat XP dan muncul di tab Riwayat."
- Kalau ditanya "cara buka sertifikat": "Sertifikat diterbitkan oleh admin lewat menu Sertifikat di dashboard admin. Kamu bisa lihat tier estimasi (Participation/Competent/Excellence) di menu Vault berdasarkan EXP kamu. Setelah admin terbitkan, Vault otomatis terbuka."
- JANGAN jawab pertanyaan di luar konteks dashboard peserta
- JANGAN berikan data pribadi peserta lain
- JANGAN janjikan fitur yang tidak ada (misal: streak bonus EXP — tidak ada; Vault auto-unlock — tidak ada, admin harus terbitkan)

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard peserta magang. Ada yang bisa saya bantu terkait check-in, tugas, quest, chat grup, atau sertifikat?"`,

  // ============================================================
  // BKK — Guru Bursa Kerja Khusus (5 menu)
  // ============================================================
  bkk: `Kamu adalah "Si Pandai" — AI Resepsionis untuk Dashboard BKK (Bursa Kerja Khusus) MAGANG-CERDAS di BPJS Ketenagakerjaan Cabang Cirebon.

PERAN:
- Menyambut guru BKK & membantu menjelaskan fitur dashboard
- Membantu BKK mengajukan permintaan penempatan magang ke BPJTK
- Menjawab pertanyaan terkait menu dashboard BKK saja

MENU DASHBOARD BKK (5 menu):
1. **Beranda** — ringkasan statistik peserta dari sekolah yang dibimbing. Welcome header dengan nama + sekolah yang dibimbing (BKK bisa multi-sekolah). 4 StatCards: Total Peserta, Rata-rata EXP, Sertifikat Terbit, Akan Selesai (<14 hari). Quick actions: Ajukan Magang, Lihat Peserta, Arsip Sertifikat. Summary card Permintaan Magang (4 status chips). Leaderboard EXP Top 5. "Akan Selesai Soon" (peserta <14 hari). "Sertifikat Baru Saja Terbit". Info privacy: foto selfie, GPS, dan detail tugas internal BPJS tidak ditampilkan.
2. **Permintaan Magang** — kirim & pantau permohonan penempatan peserta ke BPJTK (badge merah di sidebar kalau ada aktif). 7 status: Draft, Terkirim, Sedang Direview, Diterima, Ditolak, Selesai, Dibatalkan. Form fields: sekolah (wajib dari list sekolah yang dibimbing), judul permintaan, jumlah peserta (1-100), tanggal mulai/selesai diajukan, jurusan yang diminta, departemen tujuan, narahubung, telepon, email, surat pengantar (text), URL surat resmi (opsional, Google Drive/Dropbox), catatan tambahan. **Bisa Create + Batalkan saja** (Edit tidak tersedia di UI). Filter: Semua / Aktif / Selesai. Detail view: lihat semua info + tanggapan admin (accepted_slots, actual dates, assigned_departments, review_notes).
3. **Peserta Magang** — lihat profil & progress peserta dari sekolah yang dibimbing (multi-sekolah). List view: filter by sekolah (kalau >1) + status (Semua/Aktif/Selesai), search. Detail view: profile header (nama, jurusan, departemen, tier, sekolah, periode), 4 stats (EXP+level, streak, kehadiran, progress waktu), **Kehadiran 7 Hari Terakhir** (grid 7 hari dengan icon check-in/check-out), **Riwayat Aktivitas** (timeline semua tugas + quest yang sudah diselesaikan + XP), Sertifikat (kalau diterbitkan, ada tombol Verifikasi Sertifikat ke link publik). Privacy notice: foto selfie, GPS, dan instruksi internal BPJS tidak ditampilkan.
4. **Sertifikat** — arsip sertifikat peserta dari sekolah BKK. 3 stat cards: Sertifikat Terbit, Siap Diterbitkan (≥500 EXP), Belum Memenuhi. **Filter: search by nama + tab Semua/Terbit/Siap** (tidak ada filter by tier — tier ditampilkan sebagai kolom). Tier otomatis: Excellence (≥1000) 🏆, Competent (≥500) ✅, Participation (<500) 📋. BKK read-only — admin yang menerbitkan. Verifikasi via link publik /api/certificate/verify?id=.
5. **Profil** — kelola data pribadi BKK. **Yang bisa diedit: WhatsApp, nomor telepon lain, dan ubah password** (form password: saat ini + baru min 8 char + konfirmasi). Yang TIDAK bisa diubah (hubungi admin): nama, email, sekolah yang dibimbing. **Upload foto profil BELUM tersedia** (akan error "hubungi admin"). Display: nama, role "Guru BKK — Pembimbing Sekolah", last login, status aktif, list sekolah yang dibimbing.

INFO LOGIN BKK:
- BKK punya ID unik format BKK-XXXX (BKK-0001, BKK-0002, dst, auto-generated)
- Login bisa via email ATAU ID BKK (server deteksi by '@' symbol)
- ID BKK bisa dilihat di admin (menu Institusi & BKK → detail sekolah → card BKK) atau tanya admin

PRIVACY BKK (3 aturan verified):
- BKK HANYA bisa lihat data peserta dari sekolah yang dibimbing (multi-sekolah didukung)
- Foto selfie check-in TIDAK ditampilkan (kolom photo_url di-exclude dari query)
- Koordinat GPS detail TIDAK ditampilkan (hanya boolean is_within_geofence + distance_meters)
- Instruksi AI / detail tugas internal BPJS TIDAK ditampilkan (hanya title + xp)

ATURAN JAWABAN:
- Pakai bahasa Indonesia, simple, profesional, ramah
- Maksimal 3-4 kalimat per jawaban
- Sebut nama menu spesifik
- Bantu BKK memahami alur pengajuan magang (kirim → tunggu review → terima/tolak → selesai)
- JANGAN jawab pertanyaan di luar konteks dashboard BKK
- JANGAN berikan data spesifik peserta
- JANGAN janjikan fitur yang tidak ada (misal: edit permintaan setelah kirim — tidak ada; upload foto profil — belum tersedia; filter sertifikat by tier — tidak ada, hanya search + status)

Jika user bertanya di luar konteks, jawab singkat: "Maaf, saya hanya melayani pertanyaan seputar dashboard BKK MAGANG-CERDAS. Ada yang bisa saya bantu terkait pengajuan magang, data peserta, atau sertifikat?"`
};

// ============================================================
// STUB fallback (rule-based) — when no API key configured
// AUDIT 2026-07-03: synced with system prompts
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
    if (q.includes('storage') || q.includes('backup') || q.includes('clean') || q.includes('hapus file') || q.includes('bersihkan'))
      return 'Untuk backup & clean file storage: buka menu **Pengaturan** → tab **Keamanan & Data** → section Storage Management. Pilih bucket (attendance-photos default >30 hari, chat-attachments default >90 hari). Klik **Backup File** dulu (download ZIP via browser), pastikan tersimpan, baru klik **Clean File** dengan ketik "HAPUS" untuk konfirmasi. Data tetap di DB, hanya file fisik yang dihapus. MANUAL SAJA, tidak ada auto-clean.';
    if (q.includes('tambah') && q.includes('peserta')) return 'Untuk tambah peserta magang, buka menu **Peserta Magang** lalu klik **Tambah Peserta** (1 orang, auto-generate username+password) atau **Batch Upload** (banyak peserta via Excel/CSV, max 100, ada template & printable kartu kredensial).';
    if (q.includes('permintaan')) return 'Menu **Permintaan Magang** menampilkan pengajuan dari BKK sekolah. Klik salah satu untuk lihat detail, lalu pilih Mulai Review / Terima (dengan accepted_slots + actual dates) / Tolak (dengan alasan) / Tandai Selesai. Ada badge merah di sidebar kalau ada pending.';
    if (q.includes('sertifikat')) return 'Untuk terbitkan sertifikat: buka menu **Sertifikat**. Tier otomatis dari EXP: Excellence (≥1000), Competent (≥500), Participation (<500). Wajib ada Kepala Cabang aktif (set di Pengaturan → Kepala Cabang). Klik Terbitkan, sistem generate verification_id.';
    if (q.includes('excel') || q.includes('upload') && q.includes('batch') || q.includes('batch upload')) return 'Untuk batch upload: menu **Peserta Magang** → **Batch Upload** → pilih mode Excel/CSV → download template → isi data → upload. Max 100 peserta per upload. Sistem generate username + password otomatis, ada download hasil CSV + print kartu kredensial.';
    if (q.includes('password')) return 'Untuk regenerate password peserta: menu **Peserta Magang** → cari peserta → klik tombol refresh (Regenerate Password). Password baru akan tampil. Untuk admin sendiri: menu **Pengaturan** → tab **Keamanan & Data** → Ubah Password Admin (default Magang@Cerdas2026!BPJS#Crb wajib ganti!).';
    if (q.includes('pembina')) return 'Untuk tambah pembina magang: buka menu **Pembina Magang** → klik **Tambah Pembina**. Isi nama, email, departemen (Pelayanan/Pemasaran/Keuangan/Lintas Bidang), telepon. Sistem auto-generate ID PB-XXXX + password. Pembina baru otomatis di-link ke grup departemen aktif yang sama (skip Lintas Bidang). Bisa reset password, toggle aktif, hapus.';
    if (q.includes('grup') || (q.includes('chat') && !q.includes('clean'))) return 'Untuk buat grup chat: menu **Grup Chat** → **Buat Grup Baru**. Pilih tipe (department/project/event), departemen, tambah anggota (pembina + peserta, cross-department seperti WhatsApp). Bisa arsipkan/restore/hapus grup (hapus permanen = semua chat hilang).';
    if (q.includes('aktivitas') || q.includes('tugas')) return 'Menu **Aktivitas** untuk kelola tugas peserta. 2 mode: "Sekali Selesai" atau "Harian Berulang" (recurring range tanggal, skip weekend, daily deadline jam, bonus +50 EXP kalau selesai SEMUA hari kerja). Ada AI Magic Compose (✨) untuk generate deskripsi. Bisa arsipkan & deploy ulang (reactivate reset completion).';
    if (q.includes('llm') || q.includes('ai provider') || q.includes('groq') || q.includes('openai') || q.includes('gemini') || q.includes('deepseek') || q.includes('qwen') || q.includes('glm') || q.includes('mistral') || q.includes('claude') || q.includes('anthropic'))
      return 'Untuk konfigurasi AI Provider: menu **Pengaturan** → tab **AI Provider**. 8 provider tersedia: Western (Groq, OpenAI GPT, Anthropic Claude, Google Gemini, Mistral AI) + China (DeepSeek, Alibaba Qwen, Zhipu GLM). API key di-set via env var di Vercel (tidak input di UI). Pilih model per provider, klik Aktifkan.';
    if (q.includes('geofence') || q.includes('radius') || q.includes('gps') || q.includes('kantor'))
      return 'Untuk set geofence kantor: menu **Pengaturan** → tab **Kantor**. Isi nama, alamat, lat/lng, radius geofence (50-500 meter, default 150m). Save via PUT /api/settings/update.';
    if (q.includes('bkk') || q.includes('sekolah') || q.includes('institusi') || q.includes('jurusan'))
      return 'Untuk kelola sekolah & BKK: menu **Institusi & BKK** → klik sekolah untuk detail. Di detail sekolah: kelola jurusan (nama+kode), kelola guru BKK (auto-generate ID BKK-XXXX + password format Bkk2026!xxxx). BKK bisa di-link ke multi-sekolah. Bisa juga kelola via menu terpisah /admin/bkk-teachers.';
    if (q.includes('kepala cabang') || q.includes('tanda tangan') || q.includes('signature') || q.includes('pejabat'))
      return 'Untuk kelola Kepala Cabang: menu **Pengaturan** → tab **Kepala Cabang**. Tambah pejabat (nama, NIP, jabatan), upload tanda tangan, set AKTIF. Hanya 1 pejabat aktif untuk terbitkan sertifikat.';
    if (q.includes('kehadiran') || q.includes('absen') || q.includes('izin') || q.includes('sakit') || q.includes('cuti') || q.includes('dinas luar'))
      return 'Menu **Kehadiran** untuk pantau check-in/out peserta (GPS + foto selfie). 4 jenis izin: Sakit, Izin, Cuti, Dinas Luar. Section: Pending Approval, Sedang Izin Hari Ini, Belum Check-In (dengan tombol Nudge), Records Table, Riwayat Izin.';
    if (q.includes('export') || q.includes('csv') || q.includes('download data'))
      return 'Untuk export data: menu **Pengaturan** → tab **Keamanan & Data** → section Export Data → klik **Data Peserta Magang (CSV)**. Download file CSV dengan semua field peserta.';
    return 'Maaf, saya hanya melayani pertanyaan seputar menu di dashboard ini. Coba tanya tentang: Peserta Magang, Permintaan Magang, Aktivitas, Kehadiran, Sertifikat, Pembina, Grup Chat, Institusi & BKK, atau Pengaturan (Kantor/AI Provider/Keamanan & Data/Kepala Cabang).';
  }

  // === PEMBINA STUB ===
  if (dashboard === 'pembina') {
    if (q.includes('deploy') || q.includes('quest') || q.includes('tugas'))
      return 'Untuk deploy quest: buka menu **Chat Grup** → pilih grup → klik **+ Deploy Quest**. Isi judul (klik ✨ Magic untuk AI generate deskripsi), deskripsi, XP (10/20/30/50, default 20), max slots (opsional). Mode "Sekali Selesai" (1x deadline) atau "Harian Berulang" (rentang tanggal + skip weekend + daily deadline). Setelah deploy, kamu HANYA bisa monitoring progress peserta — tidak bisa edit/hapus quest.';
    if (q.includes('grup') || q.includes('buat grup') || q.includes('tambah orang') || q.includes('anggota'))
      return 'Untuk buat grup: menu **Grup Saya** → **+ Buat Grup Baru**. Pilih tipe (Proyek Lintas Bidang/Department/Event), departemen, tambah pembina lain + peserta magang sebagai anggota (cross-department, bebas seperti WhatsApp). Anda otomatis jadi group_admin. Bisa arsipkan/restore grup di detail.';
    if (q.includes('foto') || q.includes('file') || q.includes('document') || (q.includes('upload') && q.includes('chat')) || q.includes('kirim foto') || q.includes('attachment'))
      return 'Untuk kirim foto/document di chat: buka **Chat Grup** → pilih grup → klik ikon 📎 di sebelah input. Support JPG/PNG/WEBP/GIF + PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV, max 10MB. Bisa tambah caption text sebelum kirim. Klik foto untuk zoom, klik document untuk download.';
    if (q.includes('clear') || q.includes('hapus file') || q.includes('hapus foto') || q.includes('storage'))
      return 'Untuk hapus semua file dari grup: buka **Chat Grup** → pilih grup → klik tombol **Clear File** (icon trash) di header. Wajib ketik "HAPUS" untuk konfirmasi. Hanya group_admin/admin yang bisa. Pesan chat tetap ada, hanya file yang dihapus permanen (hemat storage).';
    if (q.includes('profil') || q.includes('telepon') || q.includes('nama') || q.includes('ganti'))
      return 'Untuk edit profil: buka menu **Profil** → edit nama & nomor telepon → klik Simpan. Email dan departemen TIDAK bisa diubah (locked).';
    if (q.includes('edit') && (q.includes('quest') || q.includes('deploy')))
      return 'Maaf, quest yang sudah di-deploy TIDAK bisa diedit/dihapus. Pembina hanya bisa monitoring progress peserta (in_progress/completed) di Quest Card. Pastikan judul, deskripsi, XP, dan mode sudah benar sebelum klik Deploy Quest.';
    if (q.includes('chat'))
      return 'Menu **Chat Grup** untuk buka chat room grup. Realtime (Supabase, fallback polling 3 detik). Bisa kirim pesan text, foto & document (📎), dan deploy Quest Card. Lihat progress peserta yang ambil quest (in_progress/completed) di Quest Card.';
    if (q.includes('xp') || q.includes('poin') || q.includes('exp'))
      return 'Saat deploy quest, Anda pilih XP reward: 10 (Easy), 20 (Medium, default), 30 (Hard), atau 50 (Expert). XP langsung masuk ke peserta setelah mereka klik SUBMIT di quest card. Quest completed muncul di tab Riwayat menu Aktivitas peserta.';
    if (q.includes('recurring') || q.includes('harian') || q.includes('rentang') || q.includes('berulang'))
      return 'Quest mode "Harian Berulang": muncul tiap hari di rentang tanggal (start_date + end_date), skip weekend (default on), daily deadline jam 15:00-20:00 WIB (default 17:00). Peserta bisa complete 1x per hari, dapat XP per hari. Kalau selesai SEMUA hari kerja, peserta dapat bonus +50 EXP sekali.';
    return 'Maaf, saya hanya melayani pertanyaan seputar dashboard pembina. Coba tanya tentang: Beranda, Grup Saya, Chat Grup, Deploy Quest, kirim foto, atau Clear File.';
  }

  // === INTERN STUB ===
  if (dashboard === 'intern') {
    if (q.includes('check-in') || q.includes('absen') || q.includes('check in'))
      return 'Untuk absen: buka menu **Check-In** → klik tombol Check-In. Pastikan kamu di lokasi kantor BPJS (radius 150m) & ambil foto selfie (wajib). Check-in +20 EXP, check-out +10 EXP sebelum pulang.';
    if (q.includes('foto') || q.includes('file') || q.includes('document') || (q.includes('upload') && q.includes('chat')) || q.includes('kirim foto') || q.includes('attachment'))
      return 'Untuk kirim foto/document di chat: buka **Chat Grup** → pilih grup → klik ikon 📎 di sebelah input. Support JPG/PNG/WEBP/GIF + PDF/DOC/DOCX/XLS/XLSX/PPT/PPTX/TXT/CSV, max 10MB. Klik foto untuk zoom full-screen, klik document untuk download.';
    if (q.includes('quest') || (q.includes('chat') && q.includes('grup')))
      return 'Quest adalah tugas dari pembina yang di-deploy di menu **Chat Grup**. Buka chat grup → lihat Quest Card → klik **START** untuk mulai → kerjakan → klik **SUBMIT** (dengan catatan opsional) untuk selesai & dapat XP. Quest completed muncul di tab Riwayat menu Aktivitas. Bisa juga kirim foto & document di chat (klik 📎).';
    if (q.includes('aktivitas') || q.includes('tugas'))
      return 'Menu **Aktivitas** menampilkan semua tugas kamu. Tab **Aktif** = tugas belum selesai + selesai hari ini + overdue. Tab **Riwayat** = semua yang sudah selesai (tugas, quest, pekerjaan tambahan) + grid harian berulang 14 hari terakhir. Klik **Tambah** (pojok kanan) untuk catat pekerjaan tambahan + pilih XP (10/20/30/50).';
    if (q.includes('beda') && (q.includes('aktivitas') || q.includes('quest') || q.includes('tugas')))
      return '**Aktivitas** = tugas dari admin via menu Aktivitas (klik Tandai Selesai untuk EXP). **Quest** = tugas dari pembina via Chat Grup (klik START lalu SUBMIT untuk EXP). Keduanya dapat XP dan muncul di tab Riwayat.';
    if (q.includes('tambah') && (q.includes('kerja') || q.includes('pekerjaan') || q.includes('aktivitas')))
      return 'Untuk catat pekerjaan tambahan: menu **Aktivitas** → tombol **Tambah** (pojok kanan). Isi judul, deskripsi, pilih XP (10/20/30/50, default 20), lalu simpan. Tandai selesai untuk dapat XP.';
    if (q.includes('sertifikat') || q.includes('vault'))
      return 'Sertifikat ada di menu **Vault**. Status default LOCKED. Tier estimasi dari EXP: Participation (<500), Competent (≥500), Excellence (≥1000). Sertifikat diterbitkan oleh **admin** via menu Sertifikat dashboard admin (bukan otomatis saat EXP cukup). Setelah admin terbitkan, Vault terbuka dengan preview sertifikat + download PDF.';
    if (q.includes('exp') || q.includes('poin') || q.includes('xp'))
      return 'EXP didapat dari: check-in (+20), check-out (+10), tugas/aktivitas (+xp_reward, default 20), quest dari chat (+xp_reward), self-added work (+10/20/30/50), recurring-all-days-complete bonus (+50 sekali), survival kit quiz pass (+25 first time). Streak TIDAK kasih EXP, hanya counter check-in beruntun.';
    if (q.includes('izin') || q.includes('sakit') || q.includes('cuti') || q.includes('dinas luar'))
      return 'Untuk ajukan izin: menu **Check-In** → section Pengajuan Izin → klik "+ Ajukan Izin". 4 jenis: Sakit (wajib surat dokter kalau >1 hari), Izin, Cuti, Dinas Luar. Saat approved, streak TIDAK terputus.';
    if (q.includes('survival') || q.includes('modul') || q.includes('academy'))
      return '**Survival Kit Academy** ada di kartu quick-access menu Home (atau /intern/survival-kit). 8 modul: First Day, Komunikasi, Manajemen Waktu, Mental Toughness, Etos Kerja, Belajar dari Salah, BPJS Ringkas, Career Readiness. Unlock sequential (modul N terbuka kalau modul N-1 quiz passed ≥70%). Pass quiz = +25 EXP first time.';
    if (q.includes('streak') || q.includes('beruntun'))
      return 'Streak = jumlah hari check-in beruntun berturut-turut. Kalau putus (skip 1 hari), reset ke 0. Streak TIDAK kasih EXP bonus — hanya counter. Yang kasih bonus +50 EXP adalah kalau selesai SEMUA hari kerja di aktivitas recurring (bukan streak).';
    if (q.includes('profil') || q.includes('ganti') || q.includes('edit'))
      return 'Untuk edit profil: menu **Profil**. Yang bisa diedit: foto profil (max 3MB), email, WhatsApp, nomor telepon lain. Yang TIDAK bisa diubah (hubungi admin): username, nama, password, jurusan, departemen, institusi, periode magang, EXP, streak.';
    if (q.includes('home') || q.includes('beranda') || q.includes('dashboard'))
      return 'Menu **Home** menampilkan: avatar + LEVEL badge, EXP bar, Waktu Magang progress (hari tersisa), Tier saat ini, Streak hari, status Check-In hari ini, kartu Survival Kit Academy, Leaderboard Top 5, Notifikasi terbaru (nudges). Bell icon pojok kanan → link ke Sertifikat.';
    return 'Maaf, saya hanya melayani pertanyaan seputar menu di dashboard ini. Coba tanya tentang: Check-In, Aktivitas, Chat Grup, Quest, Vault/Sertifikat, Survival Kit, atau Profil.';
  }

  // === BKK STUB ===
  if (dashboard === 'bkk') {
    if (q.includes('id bkk') || q.includes('bkk-') || q.includes('login') || q.includes('kredensial') || q.includes('id saya'))
      return 'BKK punya ID unik format BKK-XXXX (BKK-0001, BKK-0002, dst, auto-generated). Login bisa via email ATAU ID BKK (server deteksi by @ symbol). ID BKK bisa dilihat di admin (menu Institusi & BKK → detail sekolah → card BKK) atau tanya admin.';
    if (q.includes('ajukan') || q.includes('kirim') || q.includes('permintaan'))
      return 'Untuk ajukan permintaan magang: menu **Permintaan Magang** → **Ajukan Permintaan** → isi form (sekolah wajib dari list yang dibimbing, judul, jumlah peserta 1-100, tanggal mulai/selesai, jurusan, departemen, narahubung, telepon, email, surat pengantar, URL surat resmi opsional, catatan) → kirim. Status: Terkirim → Sedang Direview → Diterima/Ditolak → Selesai. Bisa batalkan permintaan aktif. **Edit permintaan tidak tersedia di UI** — kalau salah, batalkan dan buat baru.';
    if (q.includes('edit') && (q.includes('permintaan') || q.includes('ajukan')))
      return 'Maaf, edit permintaan yang sudah dikirim TIDAK tersedia di UI. Kalau ada perubahan, batalkan permintaan aktif (klik "Batalkan Permintaan" di detail) lalu buat permintaan baru dengan data yang benar.';
    if (q.includes('sertifikat') || q.includes('arsip'))
      return 'Arsip sertifikat peserta ada di menu **Sertifikat**. 3 stat cards: Terbit, Siap Diterbitkan (≥500 EXP), Belum Memenuhi. Filter: search by nama + tab Semua/Terbit/Siap (tidak ada filter by tier — tier ditampilkan sebagai kolom). Tier otomatis: Excellence (≥1000), Competent (≥500), Participation (<500). BKK read-only — admin yang menerbitkan. Verifikasi via link publik.';
    if (q.includes('peserta') || q.includes('siswa') || q.includes('aktivitas') || q.includes('riwayat'))
      return 'Data peserta dari sekolah yang Anda bimbing ada di menu **Peserta Magang**. Klik salah satu untuk lihat detail: profile header, 4 stats (EXP, streak, kehadiran, progress waktu), **Kehadiran 7 Hari Terakhir** (grid dengan icon check-in/out), **Riwayat Aktivitas** (timeline tugas + quest yang sudah dikerjakan + XP), Sertifikat (kalau ada). Privacy: foto selfie, GPS, dan instruksi internal BPJS tidak ditampilkan.';
    if (q.includes('privacy') || q.includes('privasi') || q.includes('data') || q.includes('foto') || q.includes('gps'))
      return 'Privacy BKK: (1) BKK HANYA bisa lihat peserta dari sekolah yang dibimbing (multi-sekolah didukung). (2) Foto selfie check-in TIDAK ditampilkan. (3) Koordinat GPS detail TIDAK ditampilkan (hanya boolean within_geofence + distance_meters). (4) Instruksi AI / detail tugas internal BPJS TIDAK ditampilkan (hanya title + XP).';
    if (q.includes('profil') || q.includes('telepon') || q.includes('password') || q.includes('foto profil'))
      return 'Untuk edit profil: menu **Profil**. Yang bisa diedit: WhatsApp, nomor telepon lain, dan ubah password (form: saat ini + baru min 8 char + konfirmasi). Yang TIDAK bisa diubah (hubungi admin): nama, email, sekolah yang dibimbing. **Upload foto profil BELUM tersedia** (akan error "hubungi admin").';
    if (q.includes('multi') || q.includes('sekolah') || q.includes('banyak sekolah'))
      return 'Ya, BKK bisa membimbing multi-sekolah (many-to-many). Di Beranda, semua sekolah ditampilkan sebagai pill. Di Peserta Magang, ada filter by sekolah kalau >1. Privacy: BKK hanya lihat peserta dari sekolah yang dibimbing.';
    if (q.includes('beranda') || q.includes('home') || q.includes('dashboard'))
      return 'Menu **Beranda** menampilkan: welcome header (nama + sekolah), quick actions (Ajukan Magang/Lihat Peserta/Arsip Sertifikat), summary Permintaan Magang, 4 StatCards (Total Peserta, Rata-rata EXP, Sertifikat Terbit, Akan Selesai <14 hari), Leaderboard Top 5, Akan Selesai Soon, Sertifikat Baru Terbit, info privacy.';
    return 'Maaf, saya hanya melayani pertanyaan seputar dashboard BKK. Coba tanya tentang: Beranda, Permintaan Magang, Peserta Magang, Sertifikat, Profil, ID BKK, atau Privacy BKK.';
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
