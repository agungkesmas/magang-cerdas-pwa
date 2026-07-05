'use client';

import { Printer, Copy, X } from 'lucide-react';

// ============================================================
// PrintCredentialsModal — Reusable printable cards for 3 roles
// ============================================================
// Usage:
//   <PrintCredentialsModal
//     items={[{ name, idLabel, idValue, password, loginUrl, subInfo }]}
//     role="peserta" | "pembina" | "bkk"
//     onClose={...}
//   />

export interface PrintableCredential {
  name: string;
  idLabel: string;       // "Username" / "ID Pembina" / "ID BKK"
  idValue: string;       // SRHGW6Z / PB-0001 / BKK-0001
  password: string;
  loginUrl: string;      // /intern/login / /pembina/login / /bkk/login
  subInfo?: { label: string; value: string }[]; // [{label: "Jurusan", value: "RPL"}, ...]
}

interface Props {
  items: PrintableCredential[];
  role: 'peserta' | 'pembina' | 'bkk';
  onClose: () => void;
}

const ROLE_CONFIG = {
  peserta: {
    label: 'PESERTA MAGANG',
    accentColor: 'bg-bpjs-yellow text-bpjs-blue-dark',
    cardBorder: 'border-bpjs-yellow',
    idColor: 'text-bpjs-yellow',
  },
  pembina: {
    label: 'PEMBINA MAGANG',
    accentColor: 'bg-purple-600 text-white',
    cardBorder: 'border-purple-600',
    idColor: 'text-purple-700',
  },
  bkk: {
    label: 'GURU BKK',
    accentColor: 'bg-bpjs-green text-white',
    cardBorder: 'border-bpjs-green',
    idColor: 'text-bpjs-green',
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

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none print:max-w-none">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white print:hidden">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-5 h-5" /> Kartu Kredensial {config.label} ({items.length})
          </h3>
          <div className="flex gap-2">
            <button
              onClick={copyAll}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Copy className="w-4 h-4" /> Copy Semua
            </button>
            <button
              onClick={handlePrint}
              className="text-sm bg-bpjs-blue text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 print:p-2">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3">
            {items.map((r, idx) => (
              <div
                key={idx}
                className={`border-2 ${config.cardBorder} rounded-xl p-4 bg-white print:break-inside-avoid`}
              >
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <div className={`w-10 h-10 ${config.accentColor} rounded-lg flex items-center justify-center`}>
                    <span className="font-bold text-xs">BPJS</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs text-bpjs-blue">MAGANG-CERDAS</p>
                    <p className="text-[10px] text-gray-500">{config.label}</p>
                  </div>
                </div>
                <p className="font-bold text-sm text-gray-900 mb-2 break-words">{r.name}</p>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-gray-500">{r.idLabel}:</span>{' '}
                    <span className={`font-mono font-bold ${config.idColor}`}>{r.idValue}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Password:</span>{' '}
                    <span className={`font-mono font-bold ${config.idColor}`}>{r.password}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Login:</span>{' '}
                    <span className="font-mono text-[10px] break-all">
                      {typeof window !== 'undefined' ? window.location.origin : 'magang-cerdas-pwa.vercel.app'}
                      {r.loginUrl}
                    </span>
                  </div>
                  {r.subInfo?.map((info, i) => (
                    <div key={i}>
                      <span className="text-gray-500">{info.label}:</span> {info.value}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400 text-center">
                  Simpan kredensial ini dengan aman. Jangan bagikan ke orang lain.
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
