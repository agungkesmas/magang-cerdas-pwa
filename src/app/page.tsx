import Link from 'next/link';
import { Building2, Zap, GraduationCap, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0A0E1A] via-[#0F1525] to-[#1A2138] flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-bpjs-yellow/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-bpjs-blue/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-bpjs-green/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-bpjs-yellow to-amber-500 rounded-2xl mb-4 shadow-2xl glow-yellow">
            <Zap className="w-12 h-12 text-bpjs-blue-dark" strokeWidth={2.5} />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-3"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            MAGANG-CERDAS
          </h1>
          <p className="text-bpjs-yellow font-medium tracking-[0.3em] text-xs sm:text-sm uppercase mb-2">
            BPJS Ketenagakerjaan Cabang Cirebon
          </p>
          <p className="text-white/60 text-sm max-w-xl mx-auto">
            Sistem Manajemen Magang Cerdas dengan AI Adaptif untuk BPJS Ketenagakerjaan Cabang Cirebon.
            Pilih peran Anda untuk masuk.
          </p>
        </div>

        {/* 3 Login Cards */}
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
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

          {/* Intern Card */}
          <Link
            href="/intern/login"
            className="group glass-card p-6 hover:scale-[1.02] transition-all duration-300 hover:border-bpjs-yellow/40 hover:shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bpjs-yellow to-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-8 h-8 text-bpjs-blue-dark" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Agent Academy
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Dashboard peserta magang: check-in, aktivitas, logbook, survival kit, sertifikat.
            </p>
            <div className="inline-flex items-center gap-1 text-bpjs-yellow text-sm font-semibold group-hover:gap-2 transition-all">
              Masuk sebagai Peserta Magang
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* BKK Card */}
          <Link
            href="/bkk/login"
            className="group glass-card p-6 hover:scale-[1.02] transition-all duration-300 hover:border-bpjs-yellow/40 hover:shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bpjs-green to-bpjs-green-dark flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              BKK Dashboard
            </h2>
            <p className="text-white/60 text-sm mb-4">
              Monitor peserta magang dari institusi Anda: kehadiran, logbook, progress.
            </p>
            <div className="inline-flex items-center gap-1 text-bpjs-yellow text-sm font-semibold group-hover:gap-2 transition-all">
              Masuk sebagai Guru BKK
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} BPJS Ketenagakerjaan Cabang Cirebon • MAGANG-CERDAS PWA
          </p>
        </div>
      </div>
    </main>
  );
}
