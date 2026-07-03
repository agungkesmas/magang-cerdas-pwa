import Link from 'next/link';
import { Building2, UserCog, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react';

// ============================================================
// /staff-access — Hidden staff login portal
// NOT linked from landing page (only via discreet shield icon)
// Contains: Admin Console + Pembina Magang logins
// ============================================================

export default function StaffAccessPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#0F1525] to-[#1A2138] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-bpjs-blue/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke beranda
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl mb-3 shadow-2xl">
            <ShieldCheck className="w-9 h-9 text-white" strokeWidth={2.5} />
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-white mb-2"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Staff Access
          </h1>
          <p className="text-white/50 text-sm max-w-md mx-auto">
            Portal login khusus staff BPJS Ketenagakerjaan Cabang Cirebon.
            Akses terbatas — aktivitas tercatat dan dipantau.
          </p>
        </div>

        {/* 2 Login Cards — Admin & Pembina */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Admin Card */}
          <Link
            href="/admin/login"
            className="group glass-card p-6 hover:scale-[1.02] transition-all duration-300 hover:border-bpjs-yellow/40 hover:shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bpjs-blue to-bpjs-blue-light flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Admin Console
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Kelola peserta magang, tugas, sertifikat, guru BKK, dan pengaturan sistem.
            </p>
            <div className="inline-flex items-center gap-1 text-bpjs-yellow text-sm font-semibold group-hover:gap-2 transition-all">
              Masuk sebagai Admin
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Pembina Card */}
          <Link
            href="/pembina/login"
            className="group glass-card p-6 hover:scale-[1.02] transition-all duration-300 hover:border-bpjs-yellow/40 hover:shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UserCog className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Pembina Magang
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Deploy quest ke grup chat, monitor progress peserta, berikan XP.
            </p>
            <div className="inline-flex items-center gap-1 text-bpjs-yellow text-sm font-semibold group-hover:gap-2 transition-all">
              Masuk sebagai Pembina
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Security notice */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-[11px]">
            🔒 Semua percobaan login dipantau. Akses tidak sah akan diblokir otomatis.
          </p>
          <p className="text-white/30 text-[10px] mt-1">
            © {new Date().getFullYear()} BPJS Ketenagakerjaan Cabang Cirebon
          </p>
        </div>
      </div>
    </main>
  );
}
