'use client';

import { useState, useEffect, useRef } from 'react';
import SecurityWrapper from '@/components/shared/SecurityWrapper';
<<<<<<< HEAD
=======
import ShareButton from '@/components/shared/ShareButton';
>>>>>>> ea33e57 (feat: tombol berbagi prestasi via WhatsApp/Web Share di 4 halaman peserta)
import {
  Trophy,
  Lock,
  Loader2,
  Award,
  Download,
  ShieldCheck,
  Star,
  Zap,
  Crown,
  Calendar,
  Clock,
  TrendingUp
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { calculateTier, calculateTierProgress } from '@/lib/utils';

export default function InternCertificatePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [res, certRes] = await Promise.all([
        fetch('/api/dashboard/intern'),
        fetch('/api/certificate/settings')
      ]);
      const d = await res.json();
      const cs = await certRes.json();
      if (d.success) {
        // Merge certificate settings ke data
        const certSettings = cs.success ? cs.settings : {
          logo_url: null,
          border_color: '#0F4C81',
          accent_color: '#D4AF37',
          logo_size: 64
        };
        setData({ ...d, certSettings });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Sertifikat-Magang-${data.profile.name.replace(/\s+/g, '-')}.pdf`);
    } catch (e: any) {
      alert('Error generating PDF: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" />
      </div>
    );
  }

  const { profile, certificate, official, leaderboard, certSettings } = data;
  const isUnlocked = profile.certificate_unlocked && certificate;

  // Certificate settings (dari DB, fallback ke default)
  const cs = certSettings || {
    logo_url: null,
    border_color: '#0F4C81',
    accent_color: '#D4AF37',
    logo_size: 64
  };
  const borderColor = cs.border_color || '#0F4C81';
  const accentColor = cs.accent_color || '#D4AF37';
  const logoUrl = cs.logo_url;
  const logoSize = cs.logo_size || 64;

  return (
    <SecurityWrapper>
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Certificate Vault
        </h1>
        <p className="text-sm text-white/60 mt-1">Hall of Fame & Sertifikat Magang Anda</p>
      </div>

      {/* Vault status */}
      {!isUnlocked && (
        <div className="glass-card p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-bpjs-yellow/5 to-transparent"></div>
          <div className="relative">
            <div className="w-20 h-20 mx-auto mb-3 bg-white/5 rounded-2xl flex items-center justify-center">
              <Lock className="w-10 h-10 text-white/40" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Vault Terkunci</h3>
            <p className="text-sm text-white/60 mb-3">
              Capai <span className="text-bpjs-yellow font-bold">tier Competent</span> (25% dari maksimal EXP magang Anda) untuk membuka Vault
              <br />
              Atau minta Admin menerbitkan sertifikat untuk Anda.
            </p>
            <div className="max-w-xs mx-auto">
              {(() => {
                const tp = calculateTierProgress(profile.total_exp, profile.start_date, profile.end_date);
                return (
                  <>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/60">
                        {profile.total_exp} / {tp.max_exp} EXP
                      </span>
                      <span className="text-bpjs-yellow">{tp.percentage}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-bpjs-yellow to-amber-500"
                        style={{ width: `${tp.percentage}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[11px] text-white/50">
                      Tier saat ini: <span className="font-semibold text-white/80">{tp.current_tier}</span>
                      {tp.next_tier && (
                        <> • Butuh <span className="text-bpjs-yellow font-semibold">{(tp.next_tier_exp || 0) - profile.total_exp} EXP</span> lagi ke {tp.next_tier}</>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Preview Sertifikat Prestisius — motivasi peserta */}
      {!isUnlocked && <CertificatePreview profile={profile} certSettings={{ logoUrl, borderColor, accentColor, logoSize }} />}

      {/* Leaderboard */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-bpjs-yellow" />
          <h3 className="text-sm font-semibold text-white">Leaderboard Saat Ini</h3>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {leaderboard.slice(0, 10).map((entry: any, idx: number) => (
            <div
              key={entry.id}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                entry.id === profile.id ? 'bg-bpjs-yellow/10 border border-bpjs-yellow/30' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0
                    ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                    : idx === 1
                    ? 'bg-gray-300 text-gray-700'
                    : idx === 2
                    ? 'bg-orange-400 text-orange-900'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{entry.name}</div>
                <div className="text-xs text-white/40">{entry.major}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-bpjs-yellow">{entry.total_exp}</div>
                <div className="text-xs text-white/40">EXP</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate (unlocked) */}
      {isUnlocked && (
        <div className="space-y-3">
          <div className="glass-card p-3 bg-bpjs-green/10 border-bpjs-green/30 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-bpjs-green" />
            <span className="text-bpjs-green font-semibold text-sm">Sertifikat Anda telah diterbitkan!</span>
          </div>

          {/* Certificate preview */}
          <div className="overflow-x-auto">
            <div
              ref={certificateRef}
              className="bg-white p-8 rounded-lg shadow-2xl mx-auto"
              style={{ width: '800px', maxWidth: '100%', minHeight: '560px' }}
            >
              {/* BPJS Header */}
              <div className="flex items-center justify-between border-b-4 border-bpjs-blue pb-4 mb-6">
                <div className="flex items-center gap-3">
                  {/* Logo BPJS Ketenagakerjaan asli */}
                  <img
                    src="/bpjs-ketenagakerjaan-logo.png"
                    alt="BPJS Ketenagakerjaan"
                    className="h-14 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      const parent = (e.target as HTMLImageElement).parentElement;
                      if (parent) {
                        parent.innerHTML = '<div class="font-bold text-bpjs-blue text-lg" style="font-family: Plus Jakarta Sans, sans-serif;">BPJS KETENAGAKERJAAN</div><div class="text-xs text-gray-500">CABANG CIREBON</div>';
                      }
                    }}
                  />
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div className="font-bold">SERTIFIKAT</div>
                  <div>MAGANG</div>
                </div>
              </div>

              {/* Body */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-2">Dengan ini menyatakan bahwa</p>
                <h2 className="text-3xl font-bold text-bpjs-blue mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  {profile.name}
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  {profile.school_origin || 'Magang'} — {profile.major}
                </p>
                <p className="text-sm text-gray-700 mb-1">
                  telah menyelesaikan program magang di BPJS Ketenagakerjaan Cabang Cirebon
                </p>
                <p className="text-sm text-gray-600">
                  pada departemen <span className="font-semibold">{profile.department}</span> periode
                </p>
                <p className="text-sm text-gray-700 font-medium">
                  {new Date(profile.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(profile.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Tier */}
              <div className="flex justify-center mb-6">
                <div
                  className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold ${
                    certificate.tier === 'Excellence'
                      ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                      : certificate.tier === 'Competent'
                      ? 'bg-bpjs-green text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  <Star className="w-5 h-5 fill-current" />
                  TIER: {certificate.tier.toUpperCase()}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-bpjs-blue">{profile.total_exp}</div>
                  <div className="text-xs text-gray-500">Total EXP</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-bpjs-blue">{profile.streak_count}</div>
                  <div className="text-xs text-gray-500">Streak Hari</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-bpjs-blue">{Math.ceil((new Date(profile.end_date).getTime() - new Date(profile.start_date).getTime()) / (1000 * 60 * 60 * 24))}</div>
                  <div className="text-xs text-gray-500">Hari Magang</div>
                </div>
              </div>

              {/* Footer with signature */}
              <div className="flex items-end justify-between pt-6 border-t-2 border-gray-200">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Verification ID</div>
                  <div className="font-mono text-sm font-bold text-bpjs-blue">{certificate.verification_id}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    <a
                      href={`/verify/${certificate.verification_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-bpjs-blue hover:underline"
                    >
                      {typeof window !== 'undefined' ? window.location.origin : ''}/verify/{certificate.verification_id}
                    </a>
                  </div>
                </div>
                <div className="text-center">
                  {official?.signature_url && (
                    <img src={official.signature_url} alt="Signature" className="h-16 object-contain mb-1" />
                  )}
                  <div className="border-t border-gray-400 pt-1 min-w-[180px]">
                    <div className="font-bold text-sm text-bpjs-blue">{official?.name}</div>
                    <div className="text-xs text-gray-600">{official?.position}</div>
                    {official?.nip && <div className="text-xs text-gray-500">NIP: {official.nip}</div>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download button */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="w-full flex items-center justify-center gap-2 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {downloading ? 'Generating PDF...' : 'Download PDF'}
          </button>

          {/* Share sertifikat */}
          <div className="mt-3 flex justify-center">
            <ShareButton
              data={{
                title: 'Sertifikat Magang BPJS Ketenagakerjaan',
                text: `🏆 Sertifikat Magang BPJS Ketenagakerjaan!\n\n${profile.name}\n${profile.major} • ${profile.department}\n\nTier: ${certificate.tier}\nEXP: ${profile.total_exp}\nPeriode: ${new Date(profile.start_date).toLocaleDateString('id-ID')} — ${new Date(profile.end_date).toLocaleDateString('id-ID')}\n\nVerification ID: ${certificate.verification_id}\nVerify: ${typeof window !== 'undefined' ? window.location.origin : ''}/verify/${certificate.verification_id}\n\n#MagangBPJS #SertifikatMagang #BPJSKetenagakerjaan`,
                url: typeof window !== 'undefined' ? `${window.location.origin}/verify/${certificate.verification_id}` : ''
              }}
              label="Bagikan Sertifikat"
              variant="default"
            />
          </div>
        </div>
      )}
    </div>
    </SecurityWrapper>
  );
}

// ============================================================
// CertificatePreview — Preview sertifikat prestisius saat vault terkunci
// Tujuan: motivasi peserta supaya berusaha capai tier Competent+ untuk dapatkan sertifikat
// ============================================================
function CertificatePreview({ profile, certSettings }: { profile: any; certSettings: { logoUrl: string | null; borderColor: string; accentColor: string; logoSize: number } }) {
  const { calculateTierProgress, calculateMaxExp, countWorkingDays } = require('@/lib/utils');

  const tp = calculateTierProgress(profile.total_exp, profile.start_date, profile.end_date);
  const maxExp = calculateMaxExp(profile.start_date, profile.end_date);
  const workingDays = countWorkingDays(profile.start_date, profile.end_date);
  const totalHours = workingDays * 8;

  const { logoUrl, borderColor, accentColor, logoSize } = certSettings;
  const previewLogoSize = Math.round(logoSize * 0.75); // scale down untuk preview

  const tierIcon = tp.current_tier === 'Excellence' ? Crown : tp.current_tier === 'Competent' ? Star : Award;
  const TierIcon = tierIcon;
  const tierLabel = tp.current_tier.toUpperCase();
  const tierDesc = tp.current_tier === 'Excellence' ? 'Pencapaian Istimewa — Top 50% Peserta'
    : tp.current_tier === 'Competent' ? 'Kompeten — Standar Industri Tercapai'
    : 'Partisipasi Aktif Program Magang';
  // Tier badge pakai accentColor untuk Excellence, borderColor untuk lainnya
  const tierColor = tp.current_tier === 'Excellence' ? accentColor : borderColor;

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          🎓 Preview Sertifikat Magang Anda
        </h3>
        <p className="text-sm text-white/60">
          Inilah sertifikat prestisius yang akan Anda dapatkan setelah menyelesaikan magang
        </p>
      </div>

      {/* Preview sertifikat — desain sama dengan halaman verifikasi publik */}
      <div className="overflow-x-auto -mx-4 px-4">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden relative min-w-0">
        {/* Border dekoratif atas — pakai warna custom */}
        <div style={{ height: '8px', background: `linear-gradient(to right, ${borderColor}, ${accentColor}, ${borderColor})` }} />

        {/* Konten */}
        <div className="p-4 sm:p-8 relative">
          {/* Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
            <Trophy className="w-72 h-72" style={{ color: borderColor }} />
          </div>

          {/* Header sertifikat */}
          <div className="relative flex items-start justify-between mb-6">
            <div className="flex items-center gap-2">
              {/* Logo: custom (blur, masih keliatan warnanya) atau default BPJS */}
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ height: `${previewLogoSize}px`, width: 'auto', filter: 'blur(5px)' }}
                  className="object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/bpjs-ketenagakerjaan-logo.png'; }}
                />
              ) : (
                <img
                  src="/bpjs-ketenagakerjaan-logo.png"
                  alt="BPJS Ketenagakerjaan"
                  style={{ height: `${previewLogoSize}px`, width: 'auto', filter: 'blur(5px)' }}
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="font-bold text-bpjs-blue-dark text-sm leading-tight" style="filter: blur(4px)">BPJS KETENAGAKERJAAN</div><div class="text-[10px] text-gray-500" style="filter: blur(3px)">CABANG CIREBON</div>';
                    }
                  }}
                />
              )}
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider" style={{ color: borderColor }}>Sertifikat Magang</div>
              <div className="font-mono text-[11px] font-bold mt-0.5 bg-gray-100 px-2 py-0.5 rounded" style={{ color: borderColor }}>
                MC-XXXX-XXXXXX
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6 relative">
            <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-1">Dengan ini menyatakan bahwa</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-bpjs-blue-dark mb-1" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {profile.name}
            </h2>
            <p className="text-xs text-gray-600">
              {profile.school_origin || 'Institusi'} • {profile.major}
            </p>
            <p className="text-xs text-gray-700 mt-2">
              telah menyelesaikan program magang di <span className="font-semibold text-bpjs-blue-dark" style={{ filter: 'blur(3px)' }}>BPJS Ketenagakerjaan Cabang Cirebon</span> pada departemen <span className="font-semibold text-bpjs-blue-dark">{profile.department}</span>
            </p>
            <p className="text-xs font-semibold text-gray-800 mt-1">
              {new Date(profile.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {new Date(profile.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Tier badge — estimasi tier saat ini, pakai warna custom */}
          <div className="flex justify-center mb-6">
            <div
              className="relative inline-flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg ring-2 ring-offset-2 ring-gray-200"
              style={{ background: `linear-gradient(to bottom right, ${tierColor}, ${tierColor}dd)` }}
            >
              <TierIcon className="w-6 h-6 text-white fill-current" />
              <div className="text-left">
                <div className="text-[9px] text-white/80 uppercase tracking-wider">TIER ESTIMASI SAAT INI</div>
                <div className="text-lg font-bold text-white">
                  {tierLabel}
                </div>
                <div className="text-[9px] text-white/90">{tierDesc}</div>
              </div>
            </div>
          </div>

          {/* Stats estimasi */}
          <div className="bg-gradient-to-br from-gray-50 to-bpjs-blue/5 rounded-lg p-3 mb-4 border border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div>
                <Calendar className="w-4 h-4 mx-auto mb-0.5 text-bpjs-blue" />
                <div className="text-base font-bold text-bpjs-blue">{workingDays}</div>
                <div className="text-[9px] text-gray-500 uppercase">Hari Kerja</div>
              </div>
              <div>
                <Clock className="w-4 h-4 mx-auto mb-0.5 text-bpjs-green" />
                <div className="text-base font-bold text-bpjs-green">{totalHours.toLocaleString('id-ID')}</div>
                <div className="text-[9px] text-gray-500 uppercase">Jam Magang</div>
              </div>
              <div>
                <Zap className="w-4 h-4 mx-auto mb-0.5 text-bpjs-yellow" />
                <div className="text-base font-bold text-bpjs-yellow">{profile.total_exp}</div>
                <div className="text-[9px] text-gray-500 uppercase">EXP Anda</div>
              </div>
              <div>
                <TrendingUp className="w-4 h-4 mx-auto mb-0.5 text-orange-500" />
                <div className="text-base font-bold text-orange-500">{tp.percentage}%</div>
                <div className="text-[9px] text-gray-500 uppercase">Capaian</div>
              </div>
            </div>
          </div>

          {/* Footer mock */}
          <div className="flex items-start justify-between pt-4 border-t border-gray-200">
            <div>
              <div className="text-[9px] text-gray-400 uppercase tracking-wider">Verification ID</div>
              <div className="font-mono text-[11px] font-bold text-gray-400">MC-XXXX-XXXXXX</div>
              <div className="text-[9px] text-gray-400 mt-0.5">Scan QR untuk verifikasi online</div>
            </div>
            <div className="text-center" style={{ filter: 'blur(4px)' }}>
              <div className="h-8 mb-1 w-32 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
              <div className="border-t border-gray-300 pt-0.5 min-w-[140px]">
                <div className="text-[10px] font-bold text-gray-400">Kepala Cabang</div>
                <div className="text-[9px] text-gray-400">BPJS Ketenagakerjaan</div>
              </div>
            </div>
          </div>
        </div>

        {/* Border dekoratif bawah — pakai warna custom */}
        <div style={{ height: '8px', background: `linear-gradient(to right, ${borderColor}, ${accentColor}, ${borderColor})` }} />
      </div>
      </div>

      {/* CTA — cara dapatkan sertifikat */}
      <div className="bg-bpjs-yellow/10 border border-bpjs-yellow/30 rounded-xl p-4 text-center">
        <p className="text-sm text-white font-medium mb-1">
          🎯 Cara Mendapatkan Sertifikat Ini
        </p>
        <p className="text-xs text-white/70 mb-3">
          Capai tier <span className="font-bold text-bpjs-yellow">Competent</span> (25% dari {maxExp.toLocaleString('id-ID')} EXP) untuk membuka Vault & meminta admin menerbitkan sertifikat resmi.
        </p>
        <div className="inline-flex items-center gap-2 text-xs text-white/80">
          <span>EXP Anda:</span>
          <span className="font-bold text-bpjs-yellow">{profile.total_exp.toLocaleString('id-ID')}</span>
          <span>/</span>
          <span>{maxExp.toLocaleString('id-ID')}</span>
          <span>•</span>
          <span>Butuh</span>
          <span className="font-bold text-bpjs-yellow">{tp.next_tier_exp ? (tp.next_tier_exp - profile.total_exp).toLocaleString('id-ID') : 0} EXP</span>
          <span>lagi ke {tp.next_tier || 'Excellence'}</span>
        </div>
      </div>
    </div>
  );
}
