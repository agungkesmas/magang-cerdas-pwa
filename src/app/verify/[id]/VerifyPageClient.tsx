'use client';

// ============================================================
// VerifyPageClient — UI untuk halaman verifikasi sertifikat publik
// Desain: prestisius, profesional, informatif
// ============================================================

import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Award,
  Calendar,
  Clock,
  TrendingUp,
  Flame,
  Building2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Printer,
  Star,
  Crown
} from 'lucide-react';

interface VerifyData {
  valid: boolean;
  certificate: {
    verification_id: string;
    tier: string;
    issue_date: string;
    created_at: string;
  };
  intern: {
    name: string;
    major: string;
    department: string;
    school_origin: string | null;
    start_date: string;
    end_date: string;
    total_exp: number;
    streak_count: number;
    photo_url: string | null;
  };
  official: {
    name: string;
    nip: string | null;
    position: string;
    branch: string | null;
    signature_url: string | null;
  } | null;
  stats: {
    working_days: number;
    total_hours: number;
    duration_months: number;
    max_exp: number;
    achievement_percent: number;
    tier: 'Excellence' | 'Competent' | 'Participation';
  };
  settings?: {
    logo_url: string | null;
    border_color: string;
    accent_color: string;
    logo_size: number;
  };
}

export default function VerifyPageClient({ data, error }: { data: VerifyData | null; error: string | null }) {
  // === STATE 1: ERROR / INVALID ===
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border-t-4 border-red-500 overflow-hidden">
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sertifikat Tidak Valid</h1>
            <p className="text-gray-600 text-sm mb-6">
              {error || 'Sertifikat tidak dapat diverifikasi.'}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left">
              <p className="text-xs text-red-700 font-medium mb-1">⚠️ Kemungkinan penyebab:</p>
              <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
                <li>Verification ID salah / tidak lengkap</li>
                <li>Sertifikat telah dicabut</li>
                <li>Sertifikat palsu / tidak terdaftar di sistem</li>
              </ul>
            </div>
            <a
              href="/"
              className="inline-block mt-6 px-6 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold rounded-lg text-sm"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  // === STATE 2: VALID — tampilkan sertifikat prestisius ===
  const { certificate: cert, intern, official, stats, settings } = data;
  const verifyUrl = typeof window !== 'undefined' ? `${window.location.origin}/verify/${cert.verification_id}` : '';

  // Certificate settings (dari DB, fallback ke default)
  const certSettings = settings || {
    logo_url: null,
    border_color: '#0F4C81',
    accent_color: '#D4AF37',
    logo_size: 64
  };
  const borderColor = certSettings.border_color;
  const accentColor = certSettings.accent_color;
  const logoUrl = certSettings.logo_url;
  const logoSize = certSettings.logo_size || 64;

  const tierConfig = {
    Excellence: {
      label: 'EXCELLENCE',
      color: 'text-amber-600',
      bg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
      ring: 'ring-amber-300',
      border: 'border-amber-400',
      icon: Crown,
      desc: 'Pencapaian Istimewa — Top 50% Peserta'
    },
    Competent: {
      label: 'COMPETENT',
      color: 'text-bpjs-blue',
      bg: 'bg-gradient-to-br from-blue-500 to-bpjs-blue',
      ring: 'ring-blue-300',
      border: 'border-bpjs-blue',
      icon: Star,
      desc: 'Kompeten — Standar Industri Tercapai'
    },
    Participation: {
      label: 'PARTICIPATION',
      color: 'text-gray-600',
      bg: 'bg-gradient-to-br from-gray-400 to-gray-500',
      ring: 'ring-gray-300',
      border: 'border-gray-400',
      icon: Award,
      desc: 'Partisipasi Aktif Program Magang'
    }
  };

  const tier = tierConfig[stats.tier as keyof typeof tierConfig] || tierConfig.Participation;
  const TierIcon = tier.icon;

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-gradient-to-br from-bpjs-blue via-bpjs-blue-dark to-gray-900 py-8 px-4">
      {/* Header — branding BPJS */}
      <div className="max-w-4xl mx-auto mb-6 text-center">
        <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20">
          <Building2 className="w-5 h-5 text-bpjs-yellow" />
          <span className="text-white font-semibold text-sm">BPJS KETENAGAKERJAAN</span>
          <span className="text-white/40">•</span>
          <span className="text-bpjs-yellow text-xs font-medium">Cabang Cirebon</span>
        </div>
        <h1 className="text-3xl font-bold text-white mt-4" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Verifikasi Sertifikat Magang
        </h1>
        <p className="text-white/60 text-sm mt-1">
          Sistem Verifikasi Resmi MAGANG-CERDAS BPJS Ketenagakerjaan
        </p>
      </div>

      {/* Status badge */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="bg-bpjs-green/20 backdrop-blur-md border border-bpjs-green/40 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-bpjs-green rounded-full flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-sm">✓ SERTIFIKAT SAH & TERVERIFIKASI</p>
            <p className="text-white/70 text-xs">
              Sertifikat ini terdaftar resmi di sistem BPJS Ketenagakerjaan Cabang Cirebon
            </p>
          </div>
          <span className="text-[10px] text-white/60 hidden sm:block">
            Diverifikasi pada {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* === SERTIFIKAT UTAMA === */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Border dekoratif atas — pakai warna custom dari settings */}
        <div style={{ height: '8px', background: `linear-gradient(to right, ${borderColor}, ${accentColor}, ${borderColor})` }} />

        {/* Konten sertifikat */}
        <div className="p-8 sm:p-12 relative">
          {/* Watermark BPJS */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <Building2 className="w-96 h-96 text-bpjs-blue" />
          </div>

          {/* Header sertifikat */}
          <div className="relative flex items-start justify-between mb-8">
            <div className="flex items-center gap-3">
              {/* Logo: custom (kalau ada) atau default BPJS — ukuran dari settings */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ height: `${logoSize}px`, width: 'auto' }}
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/bpjs-ketenagakerjaan-logo.png';
                  }}
                />
              ) : (
                <img
                  src="/bpjs-ketenagakerjaan-logo.png"
                  alt="BPJS Ketenagakerjaan"
                  style={{ height: `${logoSize}px`, width: 'auto' }}
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="font-bold text-bpjs-blue-dark text-lg leading-tight">BPJS KETENAGAKERJAAN</div><div class="text-xs text-gray-500">CABANG CIREBON</div>';
                    }
                  }}
                />
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider" style={{ color: borderColor }}>Sertifikat Magang</div>
              <div className="font-mono text-xs font-bold mt-0.5" style={{ color: borderColor }}>{cert.verification_id}</div>
              <div className="text-[10px] text-gray-400 mt-1">Cabang Cirebon</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8 relative">
            <p className="text-xs text-gray-500 uppercase tracking-[0.3em] mb-2">Dengan ini menyatakan bahwa</p>
            <h2 className="text-4xl sm:text-5xl font-bold text-bpjs-blue-dark mb-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {intern.name}
            </h2>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-3">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              <span>{intern.school_origin || 'Institusi Pendidikan'}</span>
              <span className="text-gray-300">•</span>
              <span>{intern.major}</span>
            </div>
            <p className="text-sm text-gray-700 max-w-2xl mx-auto">
              telah menyelesaikan program magang di <span className="font-semibold text-bpjs-blue-dark">BPJS Ketenagakerjaan Cabang Cirebon</span> pada departemen <span className="font-semibold text-bpjs-blue-dark">{intern.department}</span> periode
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              {new Date(intern.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(intern.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Tier badge — prestisius, pakai warna custom */}
          <div className="flex justify-center mb-8">
            <div
              className="relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl shadow-xl ring-4 ring-offset-2"
              style={{
                background: stats.tier === 'Excellence'
                  ? `linear-gradient(to bottom right, ${accentColor}, ${accentColor}dd)`
                  : `linear-gradient(to bottom right, ${borderColor}, ${borderColor}dd)`,
                // @ts-ignore — ring color via CSS var
                '--tw-ring-color': stats.tier === 'Excellence' ? `${accentColor}40` : `${borderColor}40`
              }}
            >
              <TierIcon className="w-8 h-8 text-white fill-current" />
              <div className="text-left">
                <div className="text-[10px] text-white/80 uppercase tracking-wider font-medium">TIER PENCAPAIAN</div>
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {tier.label}
                </div>
                <div className="text-[11px] text-white/90">{tier.desc}</div>
              </div>
            </div>
          </div>

          {/* Statistik magang — informatif */}
          <div className="bg-gradient-to-br from-gray-50 to-bpjs-blue/5 rounded-xl p-5 mb-8 border border-gray-200">
            <div className="text-center mb-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Statistik Magang</h3>
              <p className="text-[11px] text-gray-500">Ringkasan capaian selama program magang</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={Calendar}
                label="Hari Kerja"
                value={stats.working_days}
                subtext="hari efektif"
                color="text-bpjs-blue"
              />
              <StatCard
                icon={Clock}
                label="Jam Magang"
                value={stats.total_hours.toLocaleString('id-ID')}
                subtext="jam total"
                color="text-bpjs-green"
              />
              <StatCard
                icon={TrendingUp}
                label="Total EXP"
                value={intern.total_exp?.toLocaleString('id-ID') || 0}
                subtext={`${stats.achievement_percent}% dari maksimal`}
                color="text-bpjs-yellow"
              />
              <StatCard
                icon={Flame}
                label="Streak Terbaik"
                value={intern.streak_count || 0}
                subtext="hari beruntun"
                color="text-orange-500"
              />
            </div>

            {/* Progress bar to max */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 font-medium">Capaian terhadap Maksimal EXP</span>
                <span className="font-bold text-bpjs-blue">{stats.achievement_percent}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${tier.bg}`}
                  style={{ width: `${stats.achievement_percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer with signature + QR */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 pt-6 border-t-2 border-gray-200">
            {/* Verification ID + QR */}
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-lg border-2 border-bpjs-blue/30">
                <QRCodeSVG
                  value={verifyUrl}
                  size={80}
                  level="H"
                  includeMargin={false}
                  fgColor="#0F4C81"
                />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Verification ID</div>
                <div className="font-mono text-base font-bold text-bpjs-blue">{cert.verification_id}</div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Scan QR untuk verifikasi online
                </div>
                <div className="text-[10px] text-gray-400">
                  Diterbitkan: {new Date(cert.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Signature */}
            <div className="text-center">
              {official?.signature_url && (
                <img src={official.signature_url} alt="Tanda tangan" className="h-16 object-contain mb-1 mx-auto" />
              )}
              <div className="border-t-2 border-gray-700 pt-1.5 min-w-[200px]">
                <div className="font-bold text-sm text-bpjs-blue-dark">{official?.name || 'Kepala Cabang'}</div>
                <div className="text-xs text-gray-600">{official?.position || 'Kepala Cabang'}</div>
                {official?.nip && <div className="text-[10px] text-gray-500">NIP: {official.nip}</div>}
                {official?.branch && <div className="text-[10px] text-gray-500">{official.branch}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Border dekoratif bawah — pakai warna custom */}
        <div style={{ height: '8px', background: `linear-gradient(to right, ${borderColor}, ${accentColor}, ${borderColor})` }} />
      </div>

      {/* Action buttons */}
      <div className="max-w-4xl mx-auto mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-semibold rounded-lg border border-white/20 transition-colors text-sm"
        >
          <Printer className="w-4 h-4" /> Cetak / Save PDF
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-semibold rounded-lg transition-colors text-sm"
        >
          <Building2 className="w-4 h-4" /> Tentang MAGANG-CERDAS
        </a>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
          <ShieldCheck className="w-3 h-3" />
          <span>Sistem verifikasi resmi BPJS Ketenagakerjaan Cabang Cirebon</span>
        </div>
        <p className="text-white/30 text-[10px] mt-2">
          Untuk konfirmasi keaslian, hubungi BPJS Ketenagakerjaan Cabang Cirebon
        </p>
      </div>
    </div>
  );
}

// ============================================================
// StatCard — kartu statistik kecil
// ============================================================
function StatCard({ icon: Icon, label, value, subtext, color }: {
  icon: any;
  label: string;
  value: string | number;
  subtext: string;
  color: string;
}) {
  return (
    <div className="text-center p-2">
      <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
      <div className={`text-2xl font-bold ${color}`} style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {value}
      </div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</div>
      <div className="text-[10px] text-gray-400">{subtext}</div>
    </div>
  );
}
