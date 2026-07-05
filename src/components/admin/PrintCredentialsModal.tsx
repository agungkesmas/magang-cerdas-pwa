'use client';

import { Printer, Copy, X, ShieldCheck, Sparkles } from 'lucide-react';

// ============================================================
// PrintCredentialsModal — Reusable printable cards for 3 roles
// ============================================================
// Redesigned: gradient header, role badge, monospace credential boxes,
// decorative corner accents, security footer.
//
// Print fix: pakai visibility trick (body * hidden, modal visible)
// untuk avoid Firefox bug dimana position:fixed di-render ulang
// per halaman print.
// ============================================================

export interface PrintableCredential {
  name: string;
  idLabel: string;
  idValue: string;
  password: string;
  loginUrl: string;
  subInfo?: { label: string; value: string }[];
}

interface Props {
  items: PrintableCredential[];
  role: 'peserta' | 'pembina' | 'bkk';
  onClose: () => void;
}

const ROLE_CONFIG = {
  peserta: {
    label: 'PESERTA MAGANG',
    shortLabel: 'Peserta',
    headerGradient: 'linear-gradient(135deg, #F4B41A 0%, #C89106 100%)',
    headerTextColor: '#0B2C5C',
    accentColor: '#F4B41A',
    accentBg: 'rgba(244, 180, 26, 0.08)',
    accentBorder: 'rgba(244, 180, 26, 0.3)',
    cardBorder: '#F4B41A',
    idColor: '#C89106',
    roleIcon: '⚡',
  },
  pembina: {
    label: 'PEMBINA MAGANG',
    shortLabel: 'Pembina',
    headerGradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
    headerTextColor: '#FFFFFF',
    accentColor: '#7C3AED',
    accentBg: 'rgba(124, 58, 237, 0.08)',
    accentBorder: 'rgba(124, 58, 237, 0.3)',
    cardBorder: '#7C3AED',
    idColor: '#6D28D9',
    roleIcon: '🎓',
  },
  bkk: {
    label: 'GURU BKK',
    shortLabel: 'BKK',
    headerGradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)',
    headerTextColor: '#FFFFFF',
    accentColor: '#2E7D32',
    accentBg: 'rgba(46, 125, 50, 0.08)',
    accentBorder: 'rgba(46, 125, 50, 0.3)',
    cardBorder: '#2E7D32',
    idColor: '#1B5E20',
    roleIcon: '🏫',
  },
};

export default function PrintCredentialsModal({ items, role, onClose }: Props) {
  const config = ROLE_CONFIG[role];

  const handlePrint = () => {
    window.print();
  };

  const copyAll = () => {
    const text = items
      .map(
        (r) =>
          `Hai ${r.name}!\n${r.idLabel}: ${r.idValue}\nPassword: ${r.password}\nLogin: ${typeof window !== 'undefined' ? window.location.origin : ''}${r.loginUrl}`
      )
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    alert('Semua kredensial tersalin!');
  };

  if (items.length === 0) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://magang-cerdas-pwa.vercel.app';

  return (
    <>
      {/* Inline print CSS — hide everything except modal saat print.
          Fix Firefox bug: position:fixed di-render per halaman. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-credential-modal,
          .print-credential-modal * {
            visibility: visible !important;
          }
          .print-credential-modal {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            display: block !important;
            padding: 8px !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .print-credential-modal .print-card {
            box-shadow: none !important;
          }
          .print-credential-modal .modal-header {
            display: none !important;
          }
        }
      `}} />

      {/* Modal container — pakai class print-credential-modal untuk CSS print */}
      <div className="print-credential-modal fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none print:max-w-none">
          {/* Header bar — hidden when printing */}
          <div className="modal-header flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white print:hidden z-10">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5" /> Kartu Kredensial {config.label} ({items.length})
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium"
              >
                <Copy className="w-4 h-4" /> Copy Semua
              </button>
              <button
                onClick={handlePrint}
                className="text-sm bg-bpjs-blue text-white px-4 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm hover:bg-bpjs-blue-dark"
              >
                <Printer className="w-4 h-4" /> Print Sekarang
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Cards grid */}
          <div className="p-5 print:p-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
              {items.map((r, idx) => (
                <div
                  key={idx}
                  className="print-card relative rounded-xl overflow-hidden bg-white print:break-inside-avoid"
                  style={{ border: `2px solid ${config.cardBorder}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                >
                  {/* Decorative corner accent (top-right) */}
                  <div
                    className="absolute top-0 right-0 w-16 h-16 opacity-10 print:opacity-5"
                    style={{
                      background: config.accentColor,
                      clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
                    }}
                  />

                  {/* Header band with gradient */}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ background: config.headerGradient, color: config.headerTextColor }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs"
                        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}
                      >
                        BPJS
                      </div>
                      <div>
                        <div className="font-bold text-sm leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                          MAGANG-CERDAS
                        </div>
                        <div className="text-[10px] opacity-80 leading-tight">BPJS Ketenagakerjaan</div>
                      </div>
                    </div>
                    <div className="text-2xl">{config.roleIcon}</div>
                  </div>

                  {/* Role badge */}
                  <div className="px-4 pt-3">
                    <span
                      className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                      style={{
                        background: config.accentBg,
                        color: config.idColor,
                        border: `1px solid ${config.accentBorder}`,
                      }}
                    >
                      {config.label}
                    </span>
                  </div>

                  {/* Name — prominent */}
                  <div className="px-4 pt-2 pb-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nama</div>
                    <h3 className="font-bold text-base text-gray-900 break-words leading-tight" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                      {r.name}
                    </h3>
                  </div>

                  {/* Credential boxes */}
                  <div className="px-4 space-y-2">
                    {/* ID box */}
                    <div
                      className="rounded-lg p-2.5"
                      style={{ background: config.accentBg, border: `1px solid ${config.accentBorder}` }}
                    >
                      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: config.idColor, fontWeight: 600 }}>
                        {r.idLabel}
                      </div>
                      <div className="font-mono font-bold text-sm" style={{ color: config.idColor }}>
                        {r.idValue}
                      </div>
                    </div>

                    {/* Password box */}
                    <div
                      className="rounded-lg p-2.5"
                      style={{ background: config.accentBg, border: `1px solid ${config.accentBorder}` }}
                    >
                      <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: config.idColor, fontWeight: 600 }}>
                        Password
                      </div>
                      <div className="font-mono font-bold text-sm" style={{ color: config.idColor }}>
                        {r.password}
                      </div>
                    </div>

                    {/* Login URL */}
                    <div className="rounded-lg p-2.5 bg-gray-50 border border-gray-200">
                      <div className="text-[9px] uppercase tracking-wider mb-0.5 text-gray-400 font-semibold">
                        Login di
                      </div>
                      <div className="font-mono text-[10px] text-gray-700 break-all leading-tight">
                        {origin}{r.loginUrl}
                      </div>
                    </div>
                  </div>

                  {/* Sub info (jurusan, dept, sekolah, etc) */}
                  {r.subInfo && r.subInfo.length > 0 && (
                    <div className="px-4 pt-3 space-y-1">
                      {r.subInfo.map((info, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span className="text-gray-400">{info.label}:</span>
                          <span className="text-gray-700 font-medium text-right">{info.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer — security notice */}
                  <div
                    className="mt-3 px-4 py-2.5 flex items-center gap-1.5"
                    style={{ background: config.accentBg, borderTop: `1px solid ${config.accentBorder}` }}
                  >
                    <ShieldCheck className="w-3 h-3 flex-shrink-0" style={{ color: config.idColor }} />
                    <span className="text-[9px] leading-tight" style={{ color: config.idColor }}>
                      Simpan kredensial ini dengan aman. Jangan bagikan ke orang lain.
                    </span>
                  </div>

                  {/* Bottom decorative line */}
                  <div className="h-1" style={{ background: config.headerGradient }} />
                </div>
              ))}
            </div>

            {/* Print footer note */}
            <div className="mt-4 text-center text-xs text-gray-400 print:block hidden">
              <Sparkles className="w-3 h-3 inline mr-1" />
              MAGANG-CERDAS • BPJS Ketenagakerjaan Cabang Cirebon • Tim Syukur Mikrodigital
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
