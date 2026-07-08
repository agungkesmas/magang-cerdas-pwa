'use client';

import { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, X, Loader2, Check, AlertCircle, Printer } from 'lucide-react';

// ============================================================
// BatchUploadModal — Reusable batch upload modal for pembina & BKK
// Mirip dengan yang ada di /admin/interns tapi generic
// ============================================================

interface BatchResult {
  index: number;
  name: string;
  [key: string]: any;
}

interface Props {
  role: 'pembina' | 'bkk' | 'bkk-interns';
  onClose: () => void;
  onSuccess: (results: BatchResult[]) => void;
}

export default function BatchUploadModal({ role, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [error, setError] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = {
    pembina: {
      title: 'Batch Upload Pembina Magang',
      templateUrl: '/api/pembina/template',
      parseUrl: '/api/pembina/parse-excel',
      createUrl: '/api/pembina/batch-create',
      dataKey: 'pembina',
      idField: 'pembina_id',
      idLabel: 'ID Pembina',
      accentColor: 'bg-purple-600 hover:bg-purple-700',
    },
    bkk: {
      title: 'Batch Upload Guru BKK',
      templateUrl: '/api/bkk-teachers/template',
      parseUrl: '/api/bkk-teachers/parse-excel',
      createUrl: '/api/bkk-teachers/batch-create',
      dataKey: 'teachers',
      idField: 'bkk_id',
      idLabel: 'ID BKK',
      accentColor: 'bg-bpjs-green hover:bg-bpjs-green-dark',
    },
    'bkk-interns': {
      title: 'Batch Upload Peserta Magang',
      templateUrl: '/api/bkk/template',
      parseUrl: '/api/bkk/parse-excel',
      createUrl: '/api/bkk/batch-create',
      dataKey: 'interns',
      idField: 'username',
      idLabel: 'Username',
      accentColor: 'bg-bpjs-green hover:bg-bpjs-green-dark',
    },
  }[role];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError('');
      setParsedData(null);
      setResults(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setParsing(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(config.parseUrl, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setParsedData(data[config.dataKey]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleCreate = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setBatchLoading(true);
    setError('');
    try {
      const res = await fetch(config.createUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [config.dataKey]: parsedData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.results);
      onSuccess(data.results);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!results) return;
    const headers = role === 'pembina'
      ? ['Index', 'Nama', 'ID Pembina', 'Email', 'Password', 'Departemen', 'Status', 'Error']
      : role === 'bkk'
      ? ['Index', 'Nama', 'ID BKK', 'Email', 'Password', 'Sekolah', 'Status', 'Error']
      : ['Index', 'Nama', 'Username', 'Password', 'Departemen', 'Sekolah', 'Status', 'Error'];
    const rows = results.map((r) => {
      if (role === 'pembina') {
        return [r.index, r.name, r.pembina_id || '', r.email || '', r.raw_password || '', r.department || '', r.success ? 'Sukses' : 'Gagal', r.error || ''];
      } else if (role === 'bkk') {
        return [r.index, r.name, r.bkk_id || '', r.email || '', r.raw_password || '', (r.schools || []).join('; '), r.success ? 'Sukses' : 'Gagal', r.error || ''];
      }
      // bkk-interns
      return [r.index, r.name, r.username || '', r.raw_password || '', r.department || '', r.school || '', r.success ? 'Sukses' : 'Gagal', r.error || ''];
    });
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil-batch-${role}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const successCount = results?.filter((r) => r.success).length || 0;
  const errorCount = results?.filter((r) => !r.success).length || 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={`flex items-center justify-between p-5 text-white ${config.accentColor} rounded-t-2xl`}>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Upload className="w-5 h-5" /> {config.title}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Download template */}
          {!results && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">1</span>
                  Download Template
                </h4>
                <p className="text-xs text-gray-500 mb-3">Download template Excel, isi data, lalu upload kembali.</p>
                <a
                  href={config.templateUrl}
                  className={`inline-flex items-center gap-2 ${config.accentColor} text-white text-sm font-semibold px-4 py-2 rounded-lg`}
                >
                  <Download className="w-4 h-4" /> Download Template Excel
                </a>
              </div>

              {/* Step 2: Upload file */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">2</span>
                  Upload File Excel
                </h4>
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 bg-white border-2 border-dashed border-gray-300 hover:border-gray-400 text-gray-600 text-sm px-4 py-2 rounded-lg"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> {file ? file.name : 'Pilih file...'}
                  </button>
                  {file && (
                    <button
                      onClick={handleParse}
                      disabled={parsing}
                      className={`inline-flex items-center gap-2 ${config.accentColor} text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50`}
                    >
                      {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Parse & Preview
                    </button>
                  )}
                </div>
              </div>

              {/* Step 3: Preview data */}
              {parsedData && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold">3</span>
                    Preview Data ({parsedData.length} baris)
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-1 px-2">#</th>
                          <th className="text-left py-1 px-2">Nama</th>
                          <th className="text-left py-1 px-2">Email</th>
                          {role === 'pembina' ? (
                            <th className="text-left py-1 px-2">Departemen</th>
                          ) : (
                            <th className="text-left py-1 px-2">Sekolah</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((d, i) => (
                          <tr key={i} className="border-b border-gray-100">
                            <td className="py-1 px-2 text-gray-400">{i + 1}</td>
                            <td className="py-1 px-2">{d.name}</td>
                            <td className="py-1 px-2 text-gray-600">{d.email}</td>
                            {role === 'pembina' ? (
                              <td className="py-1 px-2">{d.department}</td>
                            ) : (
                              <td className="py-1 px-2">{(d.school_names || []).join(', ')}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 5 && (
                    <p className="text-xs text-gray-400 mt-2">...dan {parsedData.length - 5} baris lainnya</p>
                  )}
                  <button
                    onClick={handleCreate}
                    disabled={batchLoading}
                    className={`mt-3 inline-flex items-center gap-2 ${config.accentColor} text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50`}
                  >
                    {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Buat {parsedData.length} {role === 'pembina' ? 'Pembina' : role === 'bkk' ? 'Guru BKK' : 'Peserta Magang'}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Results */}
          {results && (
            <>
              <div className={`rounded-xl p-4 ${errorCount === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'} border`}>
                <div className="flex items-center gap-2 mb-2">
                  {errorCount === 0 ? <Check className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                  <h4 className="font-bold text-gray-900">
                    {successCount} berhasil dibuat{errorCount > 0 ? `, ${errorCount} gagal` : ''}
                  </h4>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={downloadCSV} className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg">
                    <Download className="w-4 h-4" /> Download Hasil CSV
                  </button>
                  {successCount > 0 && (
                    <button onClick={() => setShowPrint(true)} className={`inline-flex items-center gap-1 ${config.accentColor} text-white text-sm px-3 py-1.5 rounded-lg`}>
                      <Printer className="w-4 h-4" /> Print Kartu Kredensial
                    </button>
                  )}
                  <button onClick={onClose} className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-lg">
                    Selesai
                  </button>
                </div>
              </div>

              {/* Results table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-1 px-2">#</th>
                      <th className="text-left py-1 px-2">Nama</th>
                      <th className="text-left py-1 px-2">{config.idLabel}</th>
                      <th className="text-left py-1 px-2">Password</th>
                      <th className="text-left py-1 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${r.success ? '' : 'bg-red-50'}`}>
                        <td className="py-1 px-2 text-gray-400">{r.index}</td>
                        <td className="py-1 px-2 font-medium">{r.name}</td>
                        <td className="py-1 px-2 font-mono">{r[config.idField] || '-'}</td>
                        <td className="py-1 px-2 font-mono">{r.raw_password || '-'}</td>
                        <td className="py-1 px-2">
                          {r.success ? (
                            <span className="text-green-600 font-medium">✓ Sukses</span>
                          ) : (
                            <span className="text-red-600 font-medium" title={r.error}>✗ {r.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Print modal for batch results */}
      {showPrint && results && (
        <BatchPrintResults
          results={results.filter((r) => r.success)}
          role={role}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// BatchPrintResults — Print credentials dari batch results
// ============================================================
function BatchPrintResults({ results, role, onClose }: { results: BatchResult[]; role: 'pembina' | 'bkk' | 'bkk-interns'; onClose: () => void }) {
  const handlePrint = () => window.print();
  const config = {
    pembina: { label: 'PEMBINA MAGANG', idField: 'pembina_id', idLabel: 'ID Pembina', loginUrl: '/pembina/login', accent: '#7C3AED', gradient: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)', icon: '🎓' },
    bkk: { label: 'GURU BKK', idField: 'bkk_id', idLabel: 'ID BKK', loginUrl: '/bkk/login', accent: '#2E7D32', gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)', icon: '🏫' },
    'bkk-interns': { label: 'PESERTA MAGANG', idField: 'username', idLabel: 'Username', loginUrl: '/intern/login', accent: '#2E7D32', gradient: 'linear-gradient(135deg, #2E7D32 0%, #1B5E20 100%)', icon: '🎓' },
  }[role];

  const copyAll = () => {
    const text = results.map((r) => `${config.label}\n${config.idLabel}: ${r[config.idField]}\nNama: ${r.name}\nPassword: ${r.raw_password}\nLogin: ${window.location.origin}${config.loginUrl}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(text);
    alert('Semua kredensial tersalin!');
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .batch-print-modal, .batch-print-modal * { visibility: visible !important; }
          .batch-print-modal { position: absolute !important; inset: 0 !important; background: white !important; display: block !important; padding: 8px !important; max-height: none !important; overflow: visible !important; }
          .batch-print-modal .batch-modal-header { display: none !important; }
        }
      `}} />
      <div className="batch-print-modal fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="batch-modal-header flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white print:hidden z-10">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-5 h-5" /> Kartu Kredensial {config.label} ({results.length})
            </h3>
            <div className="flex gap-2">
              <button onClick={copyAll} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
                Copy Semua
              </button>
              <button onClick={handlePrint} className="text-sm bg-bpjs-blue text-white px-4 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold shadow-sm hover:bg-bpjs-blue-dark">
                <Printer className="w-4 h-4" /> Print Sekarang
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-5 print:p-3">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
              {results.map((r, idx) => (
                <div key={idx} className="print-card relative rounded-xl overflow-hidden bg-white print:break-inside-avoid" style={{ border: `2px solid ${config.accent}`, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ background: config.gradient, color: '#fff' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>BPJS</div>
                      <div>
                        <div className="font-bold text-sm leading-tight">MAGANG-CERDAS</div>
                        <div className="text-[10px] opacity-80 leading-tight">BPJS Ketenagakerjaan</div>
                      </div>
                    </div>
                    <div className="text-2xl">{config.icon}</div>
                  </div>
                  <div className="px-4 pt-3">
                    <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ background: `${config.accent}14`, color: config.accent, border: `1px solid ${config.accent}4D` }}>
                      {config.label}
                    </span>
                  </div>
                  <div className="px-4 pt-2 pb-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Nama</div>
                    <h3 className="font-bold text-base text-gray-900 break-words leading-tight">{r.name}</h3>
                  </div>
                  <div className="px-4 space-y-2">
                    <div className="rounded-lg p-2.5" style={{ background: `${config.accent}14`, border: `1px solid ${config.accent}4D` }}>
                      <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: config.accent }}>{config.idLabel}</div>
                      <div className="font-mono font-bold text-sm" style={{ color: config.accent }}>{r[config.idField]}</div>
                    </div>
                    <div className="rounded-lg p-2.5" style={{ background: `${config.accent}14`, border: `1px solid ${config.accent}4D` }}>
                      <div className="text-[9px] uppercase tracking-wider mb-0.5 font-semibold" style={{ color: config.accent }}>Password</div>
                      <div className="font-mono font-bold text-sm" style={{ color: config.accent }}>{r.raw_password}</div>
                    </div>
                    <div className="rounded-lg p-2.5 bg-gray-50 border border-gray-200">
                      <div className="text-[9px] uppercase tracking-wider mb-0.5 text-gray-400 font-semibold">Login di</div>
                      <div className="font-mono text-[10px] text-gray-700 break-all leading-tight">{typeof window !== 'undefined' ? window.location.origin : ''}{config.loginUrl}</div>
                    </div>
                  </div>
                  {r.email && (
                    <div className="px-4 pt-3 text-[11px]">
                      <span className="text-gray-400">Email:</span> <span className="text-gray-700 font-medium">{r.email}</span>
                    </div>
                  )}
                  <div className="mt-3 px-4 py-2.5 flex items-center gap-1.5" style={{ background: `${config.accent}14`, borderTop: `1px solid ${config.accent}4D` }}>
                    <span className="text-[9px] leading-tight" style={{ color: config.accent }}>🔒 Simpan kredensial ini dengan aman. Jangan bagikan ke orang lain.</span>
                  </div>
                  <div className="h-1" style={{ background: config.gradient }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
