'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';

interface EarlyLeaveRequest {
  id: string;
  intern_id: string;
  request_date: string;
  actual_checkout_time: string;
  reason: string;
  status: string;
  review_notes: string | null;
  created_at: string;
  interns: { name: string; department: string; username: string };
}

export default function EarlyLeaveApprovals() {
  const [requests, setRequests] = useState<EarlyLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFresh('/api/attendance/early-leave/list?status=pending');
      const data = await res.json();
      if (data.success) setRequests(data.requests || []);
    } catch {
      // Silent fail — tabel mungkin belum ada
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: string, name: string) => {
    if (!confirm(`Setujui izin pulang cepat ${name}?`)) return;
    setProcessing(id);
    try {
      const res = await fetch('/api/attendance/early-leave/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ ${data.message}`);
      fetchRequests();
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
      const res = await fetch('/api/attendance/early-leave/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: id, review_notes: rejectReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`✅ ${data.message}`);
      setRejectModal(null);
      setRejectReason('');
      fetchRequests();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading || requests.length === 0) return null;

  return (
    <>
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <h2 className="font-semibold text-amber-900">
            Izin Pulang Cepat Pending ({requests.length})
          </h2>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-lg p-3 border border-amber-100">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{r.interns?.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{r.interns?.department}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">{r.request_date}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
                      Pulang: {new Date(r.actual_checkout_time).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5">{r.reason}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(r.id, r.interns?.name)}
                  disabled={processing === r.id}
                  className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  {processing === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                  Setujui
                </button>
                <button
                  onClick={() => setRejectModal({ id: r.id, name: r.interns?.name })}
                  disabled={processing === r.id}
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

      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">Tolak Izin Pulang Cepat</h3>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Tolak izin dari <strong>{rejectModal.name}</strong>? Alasan wajib diisi.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Mis. Alasan tidak valid..."
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
