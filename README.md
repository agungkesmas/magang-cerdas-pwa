# MAGANG-CERDAS PWA

Sistem Manajemen Magang Cerdas dengan AI Adaptif untuk **BPJS Ketenagakerjaan Cabang Cirebon**.

## 🚀 Live URLs

- **App:** https://magang-cerdas-pwa.vercel.app
- **GitHub:** https://github.com/agungkesmas/magang-cerdas-pwa
- **Admin Login:** https://magang-cerdas-pwa.vercel.app/admin/login
- **Intern Login:** https://magang-cerdas-pwa.vercel.app/intern/login

## 🔑 Default Credentials

### Admin
- **Email:** `admin@magang-cerdas.local`
- **Password:** `admin123456`

### Intern
Admin membuat akun magang dari dashboard. Sistem auto-generate username + password yang dapat di-copy langsung dari UI Admin.

## 📋 Setup Database (PENTING — Jalankan Sekali)

Karena Vercel functions tidak dapat mengakses Supabase DB langsung (IPv6-only), SQL schema harus dijalankan manual:

1. Buka **Supabase Dashboard**: https://supabase.com/dashboard/project/ktfyzoowgxvllwauqpir
2. Klik **SQL Editor** di sidebar kiri → **New Query**
3. Copy seluruh isi file `supabase/schema.sql` dari repo
4. Paste di SQL Editor → klik **Run** (Ctrl+Enter)
5. Verifikasi: harus muncul pesan "Success. No rows returned" dan 11 tabel terbuat
6. Setup **Storage Buckets**:
   - Klik **Storage** di sidebar → **New Bucket**
   - Buat bucket `certificates` (Public)
   - Buat bucket `attendance-photos` (Public)

Setelah selesai, aplikasi siap digunakan.

## 🤖 Multi-Provider LLM Support

Aplikasi mendukung 8 provider AI (Western + China):

| Provider | Region | Status |
|----------|--------|--------|
| Groq (Llama 3.3) | Western | Default (cek API key) |
| OpenAI (GPT-4o) | Western | Optional |
| Anthropic (Claude 3.5) | Western | Optional |
| Google Gemini | Western | Optional |
| Mistral | Western | Optional |
| DeepSeek | China | Optional |
| Alibaba Qwen | China | Optional |
| Zhipu GLM | China | Optional |

### Cara switch provider:
1. Login sebagai Admin → **Pengaturan** → **AI Provider**
2. Pilih provider & model
3. Set API key di **Vercel Project Settings → Environment Variables**
4. Redeploy aplikasi

Jika API key tidak valid, sistem otomatis fallback ke **stub** (rule-based instruction per jurusan).

## 📦 Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes + Supabase (PostgreSQL + Storage)
- **Auth:** JWT (httpOnly cookies) + bcryptjs
- **AI:** Multi-provider LLM router (8 providers)
- **PWA:** @ducanh2912/next-pwa (service worker untuk offline logbook)
- **PDF:** html2canvas + jsPDF (client-side certificate generation)
- **Deploy:** Vercel (auto-deploy from GitHub main branch)

## 🗂️ Project Structure

```
src/
├── app/
│   ├── admin/                    # Admin Console (5 pages)
│   │   ├── login/                # Login admin
│   │   ├── interns/              # Manajemen magang + credential share
│   │   ├── tasks/                # Dynamic task builder
│   │   ├── attendance/           # Kehadiran + nudge monitor
│   │   ├── certificate/          # Penerbitan sertifikat
│   │   └── settings/             # Pengaturan kantor, LLM, officials
│   ├── intern/                   # Intern PWA (6 pages)
│   │   ├── login/                # Login intern
│   │   ├── home/                 # Agent card + dual progress
│   │   ├── attendance/           # Check-in/out (GPS + camera)
│   │   ├── survival-kit/         # 6 modul BPJS dengan drip content
│   │   ├── daily-quest/          # AI-adaptive tasks
│   │   ├── logbook/              # Logbook harian + streak
│   │   └── certificate/          # Vault + PDF download
│   └── api/                      # 35+ API routes
├── components/
│   ├── admin/AdminShell.tsx      # Sidebar + topbar admin
│   └── intern/InternShell.tsx    # Bottom nav intern (mobile-first)
├── lib/
│   ├── supabase.ts               # Server + browser clients
│   ├── auth.ts                   # JWT + bcrypt + credential generator
│   ├── llm.ts                    # Multi-provider LLM router + stub fallback
│   └── utils.ts                  # Geofencing, EXP, level calc, date format
├── types/index.ts                # TypeScript types + LLM_PROVIDERS + SURVIVAL_KIT_MODULES
└── middleware.ts                 # Auth redirect (Edge runtime)

supabase/schema.sql               # SQL DDL untuk 11 tabel + RLS
public/manifest.json              # PWA manifest
public/icons/                     # PWA icons (192, 512)
```

## 🛡️ Security

- **Service Role Key** hanya di server (API routes), tidak pernah ke client
- **RLS Policies** di Supabase: read-only untuk public (officials, certificates, settings), write via service role
- **JWT** di httpOnly cookies (tidak bisa di-read JavaScript)
- **Geofencing** 150m radius dari koordinat kantor
- **Camera** pakai `capture="user"` (front camera only)
- **Password** disimpan sebagai bcrypt hash; `raw_password` disimpan plaintext HANYA untuk share ke intern (lihat di Admin Dashboard)

## 📊 Database Schema (11 Tables)

| Table | Purpose |
|-------|---------|
| `Interns` | Data magang + auth credentials + EXP + streak |
| `Admins` | Akun admin (default: admin@magang-cerdas.local) |
| `Tasks` | Base tasks per departemen |
| `Task_Completions` | Progress magang per task + cached AI instruction |
| `Attendance` | Check-in/out dengan GPS + photo URL |
| `Logbook` | Catatan harian magang |
| `Officials` | Kepala Cabang (default: Zainal Abidin A) |
| `Certificates` | Sertifikat yang diterbitkan + verification ID |
| `App_Settings` | Config kantor + geofence + LLM provider |
| `Nudges` | Notifikasi admin → intern |

## 🔄 Update & Redeploy

Setiap push ke branch `main` akan trigger Vercel auto-deploy (2-3 menit).

## 📝 Notes

- **Groq API Key** yang diberikan user return 403 Forbidden dari server manapun (sudah di-test dari 4 endpoint berbeda). Sistem akan otomatis fallback ke stub sampai user update dengan key valid atau switch ke provider lain.
- **Koordinat default** BPJS Cabang Cirebon: Jl. Evakuasi No. 11B, Karyamulya, Kesambi, Cirebon (-6.7409720, 108.5430931). Bisa diubah dari Admin Settings.
- **Kepala Cabang default**: Zainal Abidin A. Bisa di-edit/ditambah dari Admin Settings → Officials.
