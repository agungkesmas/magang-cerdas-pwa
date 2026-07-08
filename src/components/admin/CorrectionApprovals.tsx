'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileEdit, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';

interface Correction {
  id: string;
  intern_id: string;
  correction_date: string;
  type: string;
  reason: string;
  promise_not_repeat: boolean;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  interns: { name: string; department: string; username: string };
}

export default function CorrectionApprovals() {
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchCorrections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFresh('/api/attendance/correction/list?status=pending');
      const data = await res.json();
      if (data.success) setCorrections(data.corrections || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCorrections(); }, [fetchCorrections]);

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Setujui koreksi absen ${name}? Record absen akan ditambahkan otomatis.`)) return;
    setProcessing(id);
    try {
      const res = await fetch('/api/attendance/correction/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correction_id: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ ${data.message}`);
      fetchCorrections();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('Alasan penolakan wajib diisi');
      return;
    }
    setProcessing(id);
    try {
      const res = await fetch('/api/attendance/correction/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correction_id: id, review_notes: rejectReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ ${data.message}`);
      setRejectModal(null);
      setRejectReason('');
      fetchCorrections();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileEdit className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-purple-900">Koreksi Absen Pending</h2>
        </div>
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
        </div>
      </div>
    );
  }

  if (corrections.length === 0) return null;

  return (
    <>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileEdit className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-purple-900">
            Koreksi Absen Pending ({corrections.length})
          </h2>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {corrections.map(c => (
            <div key={c.id} className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{c.interns?.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.interns?.department}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      c.type === 'Check-In' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {c.type === 'Check-In' ? '📍 Masuk' : '🏠 Pulang'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {c.correction_date}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5">{c.reason}</p>
                  {c.promise_not_repeat && (
                    <p className="text-[10px] text-green-600 mt-1">✓ Peserta berjanji tidak mengulangi</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Diajukan: {new Date(c.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(c.id, c.interns?.name)}
                  disabled={processing === c.id}
                  className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  {processing === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Setujui
                </button>
                <button
                  onClick={() => setRejectModal({ id: c.id, name: c.interns?.name })}
                  disabled={processing === c.id}
                  className="inline-flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  <XCircle className="w-3 h-3" />
                  Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Tolak Koreksi Absen</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tolak koreksi dari <strong>{rejectModal.name}</strong>? Alasan wajib diisi.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Mis. Alasan tidak valid, sudah ada record absen, di luar periode magang..."
              className="w-full p-2 border border-gray-200 rounded-md text-sm h-20 mb-3"
              maxLength={300}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Batal
              </button>
              <button
                onClick={() => handleReject(rejectModal.id)}
                disabled={processing === rejectModal.id}
                className="px-3 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50"
              >
                {processing === rejectModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tolak & Kirim Nudge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
