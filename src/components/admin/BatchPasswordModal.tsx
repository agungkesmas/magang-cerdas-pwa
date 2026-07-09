'use client';

import { useState } from 'react';
import {
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Key,
  Copy,
  Printer,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

export interface BatchPasswordUser {
  id: string;
  name: string;
  identifier: string; // username (intern) or email (bkk/pembina)
  identifierLabel: string; // 'Username' or 'Email'
}

interface BatchPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void; // callback untuk refresh list di parent
  users: BatchPasswordUser[]; // user yang dipilih
  endpoint: string; // '/api/interns/batch-password' etc
  userType: 'peserta' | 'pembina' | 'bkk'; // label for messaging
}

interface UpdateResult {
  id: string;
  name: string;
  username?: string;
  email?: string;
  raw_password: string;
}

export default function BatchPasswordModal({
  open,
  onClose,
  onSuccess,
  users,
  endpoint,
  userType
}: BatchPasswordModalProps) {
  const [mode, setMode] = useState<'auto' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<UpdateResult[] | null>(null);
  const [showPasswords, setShowPasswords] = useState(true);
  const [errorCount, setErrorCount] = useState(0);

  if (!open) return null;

  const reset = () => {
    setMode('auto');
    setCustomPassword('');
    setShowCustom(false);
    setLoading(false);
    setError('');
    setResults(null);
    setShowPasswords(true);
    setErrorCount(0);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (mode === 'custom' && customPassword.length < 8) {
      setError('Custom password minimal 8 karakter.');
      return;
    }
    if (mode === 'custom' && customPassword.length > 64) {
      setError('Custom password maksimal 64 karakter.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: users.map((u) => u.id),
          mode,
          custom_password: mode === 'custom' ? customPassword : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password');
      setResults(data.results || []);
      setErrorCount(data.error_count || 0);
      onSuccess?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAll = () => {
    if (!results) return;
    const text = results
      .map((r) => {
        const id = r.username || r.email || '';
        return `Nama: ${r.name}\n${r.username ? 'Username' : 'Email'}: ${id}\nPassword: ${r.raw_password}\n`;
      })
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('Daftar kredensial disalin ke clipboard!');
  };

  const handlePrint = () => {
    if (!results) return;
    const w = window.open('', '_blank', 'width=600,height=800');
    if (!w) return;
    const items = results
      .map(
        (r) => `
      <div style="border:1px solid #ccc;padding:12px;margin-bottom:8px;border-radius:6px;">
        <div style="font-weight:bold;font-size:14px;">${r.name}</div>
        <div style="font-size:12px;color:#666;">${r.username ? 'Username' : 'Email'}: ${r.username || r.email}</div>
        <div style="font-size:14px;margin-top:4px;">Password: <b>${r.raw_password}</b></div>
      </div>`
      )
      .join('');
    w.document.write(`
      <html>
      <head>
        <title>Kredensial ${userType} — Magang Cerdas</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; }
          h1 { font-size: 18px; }
          .meta { font-size: 11px; color: #999; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <h1>Kredensial ${userType} Magang Cerdas</h1>
        <div class="meta">Dibuat: ${new Date().toLocaleString('id-ID')}</div>
        ${items}
      </body>
      </html>`);
    w.document.close();
    w.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-bpjs-blue" />
            <h2 className="text-lg font-bold text-gray-800">Ubah Password Massal</h2>
          </div>
          <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {/* Mode selection */}
          {!results && (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-3">
                  Akan mengubah password <b>{users.length} {userType}</b> terpilih:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.id} className="text-xs text-gray-700 py-0.5">
                      • {u.name} <span className="text-gray-500">({u.identifierLabel}: {u.identifier})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'auto'}
                    onChange={() => setMode('auto')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-800">Generate otomatis per user</div>
                    <div className="text-xs text-gray-500">
                      Setiap {userType} dapat password unik berformat <code>{userType === 'peserta' ? 'Magang2026*xxxx' : userType === 'pembina' ? 'Pembina2026!xxxx' : 'Bkk2026*xxxx'}</code> (4 karakter acak). Lebih aman.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'custom'}
                    onChange={() => setMode('custom')}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-800">Password sama untuk semua</div>
                    <div className="text-xs text-gray-500 mb-2">
                      Pakai 1 password yang sama untuk semua {userType} terpilih. Cocok untuk password sementara.
                    </div>
                    {mode === 'custom' && (
                      <div className="relative">
                        <input
                          type={showCustom ? 'text' : 'password'}
                          value={customPassword}
                          onChange={(e) => setCustomPassword(e.target.value)}
                          placeholder="Min 8 karakter"
                          maxLength={64}
                          className="w-full px-3 py-2 pr-10 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCustom(!showCustom)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showCustom ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        {customPassword.length > 0 && (
                          <div className="text-xs mt-1 text-gray-500">{customPassword.length} karakter</div>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">
                  Password lama akan langsung ditimpa. {userType === 'peserta' ? 'Peserta' : userType === 'pembina' ? 'Pembina' : 'Guru BKK'} harus login dengan password baru. Pastikan mencatat/mencetak password baru sebelum menutup modal ini.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || users.length === 0}
                  className="flex-1 px-4 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  {loading ? 'Memproses...' : `Ubah Password ${users.length} ${userType}`}
                </button>
              </div>
            </>
          )}

          {/* Results view */}
          {results && (
            <>
              <div className="bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-4 mb-4 flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-bpjs-green flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-bpjs-green-dark">
                    Berhasil! {results.length} {userType} password diperbarui.
                  </p>
                  {errorCount > 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      {errorCount} {userType} gagal diubah (lihat console admin untuk detail).
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1">
                    Catat atau cetak kredensial berikut. Setelah modal ditutup, password tidak bisa dilihat lagi dari UI ini (masih bisa dari kolom password masing-masing user).
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={(e) => setShowPasswords(e.target.checked)}
                  />
                  Tampilkan password
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyAll}
                    className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" /> Salin Semua
                  </button>
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1 text-xs bg-bpjs-blue hover:bg-bpjs-blue-dark text-white px-3 py-1.5 rounded-md font-medium"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak
                  </button>
                </div>
              </div>

              {/* Results list */}
              <div className="border rounded-lg max-h-80 overflow-y-auto">
                {results.map((r, i) => (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between px-4 py-2.5 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{r.name}</div>
                      <div className="text-xs text-gray-500">
                        {r.username ? 'Username' : 'Email'}: {r.username || r.email}
                      </div>
                    </div>
                    <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded ml-2">
                      {showPasswords ? r.raw_password : '••••••••'}
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(r.raw_password)}
                      className="ml-2 p-1.5 hover:bg-gray-200 rounded text-gray-500"
                      title="Salin password"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    reset();
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Ubah Lagi
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-bold rounded-lg"
                >
                  Selesai
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
