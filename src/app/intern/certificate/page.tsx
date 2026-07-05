'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Lock,
  Loader2,
  Award,
  Download,
  ShieldCheck,
  Star,
  Zap,
  Crown
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
      const res = await fetch('/api/dashboard/intern');
      const d = await res.json();
      if (d.success) setData(d);
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

  const { profile, certificate, official, leaderboard } = data;
  const isUnlocked = profile.certificate_unlocked && certificate;

  return (
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
                  <div className="w-14 h-14 bg-bpjs-blue rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    BPJS
                  </div>
                  <div>
                    <div className="font-bold text-bpjs-blue text-lg" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      BPJS KETENAGAKERJAAN
                    </div>
                    <div className="text-xs text-gray-500">CABANG CIREBON</div>
                  </div>
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
                    Verify: {typeof window !== 'undefined' ? window.location.origin : ''}/api/certificate/verify?id={certificate.verification_id}
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
        </div>
      )}
    </div>
  );
}
