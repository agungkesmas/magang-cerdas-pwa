'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Loader2,
  Inbox,
  FileText,
  ChevronLeft,
  Calendar,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  Download,
  Paperclip,
  X,
  AlertCircle,
  Check
} from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';

interface Request {
  id: string;
  school_name: string;
  request_title: string;
  requested_slots: number;
  proposed_start_date: string;
  proposed_end_date: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  cover_letter: string | null;
  attachment_url: string | null;
  student_list_url: string | null;
  additional_notes: string | null;
  status: string;
  accepted_slots: number | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  assigned_departments: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700' },
  under_review: { label: 'Sedang Direview', color: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Diterima', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
  completed: { label: 'Selesai', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-500' },
};

export default function BKKRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFresh('/api/bkk/requests');
      const data = await res.json();
      if (data.success) setRequests(data.requests || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  if (detailId) {
    return <RequestDetail id={detailId} onBack={() => setDetailId(null)} onRefresh={fetchRequests} />;
  }

  const stats = {
    submitted: requests.filter(r => r.status === 'submitted').length,
    under_review: requests.filter(r => r.status === 'under_review').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Permintaan Magang ke BPJTK
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ajukan & pantau permohonan penempatan peserta magang
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm"
        >
          <Send className="w-4 h-4" /> Ajukan Permintaan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Terkirim', value: stats.submitted, color: 'bg-blue-50 text-blue-600' },
          { label: 'Direview', value: stats.under_review, color: 'bg-amber-50 text-amber-600' },
          { label: 'Diterima', value: stats.accepted, color: 'bg-green-50 text-green-600' },
          { label: 'Selesai', value: stats.completed, color: 'bg-gray-50 text-gray-600' },
        ].map(s => (
          <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-[10px]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-3">Belum ada permintaan magang</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Send className="w-4 h-4" /> Buat Permintaan Pertama
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {requests.map(req => {
            const meta = STATUS_META[req.status] || { label: req.status, color: 'bg-gray-100' };
            return (
              <div
                key={req.id}
                onClick={() => setDetailId(req.id)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bpjs-green/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{req.request_title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${meta.color}`}>
                    {meta.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {req.school_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {req.requested_slots} peserta
                  </span>
                  {req.proposed_start_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(req.proposed_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  <span>{new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
                {req.status === 'accepted' && req.accepted_slots && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    ✓ {req.accepted_slots} slot diterima {req.assigned_departments ? `• ${req.assigned_departments}` : ''}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <RequestFormModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchRequests(); }}
        />
      )}
    </div>
  );
}

// ============================================================
// RequestFormModal — SEDERHANA: judul, jumlah, tanggal, surat PDF, Excel siswa
// ============================================================
function RequestFormModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    request_title: '',
    requested_slots: '1',
    proposed_start_date: '',
    proposed_end_date: '',
    additional_notes: ''
  });
  const [suratFile, setSuratFile] = useState<File | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.request_title.trim()) {
      setError('Judul permintaan wajib diisi');
      return;
    }
    if (!suratFile) {
      setError('Surat resmi dari kepala sekolah wajib diupload (PDF)');
      return;
    }

    setUploading(true);
    try {
      // Step 1: Upload surat PDF
      const suratFd = new FormData();
      suratFd.append('file', suratFile);
      const suratRes = await fetch('/api/bkk/upload-attachment', { method: 'POST', body: suratFd });
      const suratData = await suratRes.json();
      if (!suratRes.ok) throw new Error(suratData.error || 'Upload surat gagal');

      // Step 2: Upload Excel siswa (opsional)
      let excelUrl: string | null = null;
      if (excelFile) {
        const excelFd = new FormData();
        excelFd.append('file', excelFile);
        const excelRes = await fetch('/api/bkk/upload-attachment', { method: 'POST', body: excelFd });
        const excelData = await excelRes.json();
        if (!excelRes.ok) throw new Error(excelData.error || 'Upload Excel gagal');
        excelUrl = excelData.url;
      }

      // Step 3: Submit request
      const res = await fetch('/api/bkk/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_title: form.request_title.trim(),
          requested_slots: parseInt(form.requested_slots) || 1,
          proposed_start_date: form.proposed_start_date || null,
          proposed_end_date: form.proposed_end_date || null,
          attachment_url: suratData.url,
          student_list_url: excelUrl,
          additional_notes: form.additional_notes.trim() || null,
          cover_letter: null,
          requested_majors: null,
          requested_departments: null,
          contact_person: null,
          contact_phone: null,
          contact_email: null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 bg-bpjs-green text-white rounded-t-2xl">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Send className="w-5 h-5" /> Ajukan Permintaan Magang
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {/* Judul */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Permintaan *</label>
            <input
              type="text"
              required
              value={form.request_title}
              onChange={e => setForm({ ...form, request_title: e.target.value })}
              placeholder="Mis. Permintaan Magang SMK Al Hidayah Semester Ganjil 2026"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
            />
          </div>

          {/* Jumlah + Tanggal */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Peserta *</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={form.requested_slots}
                onChange={e => setForm({ ...form, requested_slots: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mulai</label>
              <input
                type="date"
                value={form.proposed_start_date}
                min={today}
                onChange={e => setForm({ ...form, proposed_start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Selesai</label>
              <input
                type="date"
                value={form.proposed_end_date}
                min={form.proposed_start_date || today}
                onChange={e => setForm({ ...form, proposed_end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Upload Surat PDF */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Surat Resmi Kepala Sekolah * (PDF, max 5MB)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-600">
                  <Paperclip className="w-4 h-4" />
                  {suratFile ? suratFile.name : 'Pilih file PDF...'}
                </div>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setSuratFile(e.target.files?.[0] || null)}
                />
              </label>
              {suratFile && (
                <button type="button" onClick={() => setSuratFile(null)} className="text-red-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Upload Excel Siswa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Daftar Nama Siswa (Excel, opsional)
            </label>
            <div className="flex items-center gap-2 mb-1">
              <a
                href="/api/bkk/template"
                className="text-xs text-bpjs-green hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download Template
              </a>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-lg text-sm text-gray-600">
                  <Upload className="w-4 h-4" />
                  {excelFile ? excelFile.name : 'Pilih file Excel...'}
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={e => setExcelFile(e.target.files?.[0] || null)}
                />
              </label>
              {excelFile && (
                <button type="button" onClick={() => setExcelFile(null)} className="text-red-500 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Jika tidak upload sekarang, BKK bisa batch upload peserta nanti via menu Peserta Magang.
            </p>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              rows={2}
              value={form.additional_notes}
              onChange={e => setForm({ ...form, additional_notes: e.target.value })}
              placeholder="Catatan tambahan untuk admin BPJS..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center gap-1.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Kirim Permintaan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// RequestDetail
// ============================================================
function RequestDetail({ id, onBack, onRefresh }: { id: string; onBack: () => void; onRefresh: () => void }) {
  const [req, setReq] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchFresh(`/api/bkk/requests/${id}`)
      .then(r => r.json())
      .then(d => d.success && setReq(d.request))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('Batalkan permintaan ini? Tindakan ini tidak bisa dibatalkan.')) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bkk/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      onBack();
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-green" /></div>;
  }
  if (!req) return null;

  const meta = STATUS_META[req.status] || { label: req.status, color: 'bg-gray-100' };
  const canCancel = ['submitted', 'under_review'].includes(req.status);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-bpjs-green" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{req.request_title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>{meta.label}</span>
              <span className="text-xs text-gray-500">{new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <DetailRow icon={Building2} label="Sekolah" value={req.school_name} />
            <DetailRow icon={Users} label="Jumlah Peserta" value={`${req.requested_slots} siswa`} />
            {req.proposed_start_date && (
              <DetailRow icon={Calendar} label="Tanggal Mulai" value={new Date(req.proposed_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {req.proposed_end_date && (
              <DetailRow icon={Calendar} label="Tanggal Selesai" value={new Date(req.proposed_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
          </div>
          <div className="space-y-2">
            {req.attachment_url && (
              <a
                href={req.attachment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-bpjs-green hover:underline"
              >
                <Paperclip className="w-4 h-4" /> Lihat Surat Resmi (PDF)
              </a>
            )}
            {req.student_list_url && (
              <a
                href={req.student_list_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-bpjs-green hover:underline block"
              >
                <Download className="w-4 h-4" /> Download Daftar Siswa (Excel)
              </a>
            )}
          </div>
        </div>

        {req.additional_notes && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs font-medium text-blue-700 mb-1">Catatan:</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{req.additional_notes}</p>
          </div>
        )}
      </div>

      {/* Tanggapan Admin */}
      {req.reviewed_at && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            {req.status === 'accepted' || req.status === 'completed'
              ? <CheckCircle2 className="w-5 h-5 text-green-600" />
              : <XCircle className="w-5 h-5 text-red-600" />}
            Tanggapan Admin BPJTK
          </h3>
          <div className="space-y-2">
            {req.accepted_slots && (
              <DetailRow icon={Users} label="Slot Diterima" value={`${req.accepted_slots} peserta`} />
            )}
            {req.assigned_departments && (
              <DetailRow icon={Building2} label="Departemen" value={req.assigned_departments} />
            )}
            {req.actual_start_date && (
              <DetailRow icon={Calendar} label="Mulai Aktual" value={new Date(req.actual_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} />
            )}
            {req.actual_end_date && (
              <DetailRow icon={Calendar} label="Selesai Aktual" value={new Date(req.actual_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} />
            )}
            {req.review_notes && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">{req.review_notes}</div>
            )}
          </div>

          {/* Petunjuk setelah diterima */}
          {req.status === 'accepted' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 text-sm mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Langkah Selanjutnya:
              </h4>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>Buka menu <strong>Peserta Magang</strong> untuk lihat daftar siswa yang sudah terdaftar</li>
                <li>Klik <strong>Batch Upload</strong> jika belum upload daftar siswa</li>
                <li>Download/print <strong>Kartu Kredensial</strong> (username + password per siswa)</li>
                <li>Bagikan kartu ke masing-masing siswa</li>
                <li>Siswa login di <strong>/intern/login</strong> dan check-in di hari pertama magang</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
          Batalkan Permintaan
        </button>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-gray-500 min-w-[100px]">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}
