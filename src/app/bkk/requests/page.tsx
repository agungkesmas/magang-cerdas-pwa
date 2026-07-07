'use client';

import { useState, useEffect, useCallback } from 'react';
import SecurityWrapper from '@/components/shared/SecurityWrapper';
import {
  Send,
  Inbox,
  Loader2,
  Plus,
  X,
  ChevronLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Trash2,
  Calendar,
  Users,
  Building2,
  FileText,
  Mail,
  Phone,
  RotateCcw,
  PartyPopper,
  PencilLine,
  MessageSquare,
  ExternalLink
} from 'lucide-react';

interface Request {
  id: string;
  school_name: string;
  request_title: string;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  requested_slots: number;
  proposed_start_date: string | null;
  proposed_end_date: string | null;
  requested_majors: string | null;
  requested_departments: string | null;
  cover_letter: string | null;
  additional_notes: string | null;
  attachment_url: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  review_notes: string | null;
  accepted_slots: number | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  assigned_departments: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: PencilLine, desc: 'Belum dikirim' },
  submitted: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700', icon: Send, desc: 'Menunggu review BPJTK' },
  under_review: { label: 'Sedang Direview', color: 'bg-amber-100 text-amber-800', icon: Eye, desc: 'Admin BPJTK sedang memproses' },
  accepted: { label: 'Diterima', color: 'bg-green-100 text-green-800', icon: CheckCircle2, desc: 'Disetujui, siap penempatan' },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle, desc: 'Permintaan ditolak' },
  completed: { label: 'Selesai', color: 'bg-bpjs-green/20 text-bpjs-green-dark', icon: PartyPopper, desc: 'Magang telah selesai' },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-500', icon: Trash2, desc: 'Dibatalkan oleh pengirim' }
};

export default function BKKRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Request | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bkk/requests');
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = {
    total: requests.length,
    submitted: requests.filter((r) => r.status === 'submitted').length,
    under_review: requests.filter((r) => r.status === 'under_review').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    completed: requests.filter((r) => r.status === 'completed').length
  };

  const filtered = requests.filter((r) => {
    if (filter === 'active') return ['submitted', 'under_review', 'accepted'].includes(r.status);
    if (filter === 'closed') return ['rejected', 'completed', 'cancelled'].includes(r.status);
    return true;
  });

  if (detailId) {
    return <RequestDetail requestId={detailId} onBack={() => setDetailId(null)} onRefresh={fetchRequests} />;
  }

  return (
    <SecurityWrapper>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Permintaan Magang ke BPJTK
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ajukan & pantau permohonan penempatan peserta magang ke BPJS Ketenagakerjaan Cabang Cirebon
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" /> Ajukan Permintaan
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip icon={Send} label="Terkirim" value={stats.submitted} color="bg-blue-50 text-blue-700" />
        <StatChip icon={Eye} label="Sedang Direview" value={stats.under_review} color="bg-amber-50 text-amber-800" />
        <StatChip icon={CheckCircle2} label="Diterima" value={stats.accepted} color="bg-green-50 text-green-800" />
        <StatChip icon={PartyPopper} label="Selesai" value={stats.completed} color="bg-bpjs-green/10 text-bpjs-green-dark" />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'active', 'closed'] as const).map((f) => {
          const count = f === 'all' ? requests.length : f === 'active' ? requests.filter((r) => ['submitted', 'under_review', 'accepted'].includes(r.status)).length : requests.filter((r) => ['rejected', 'completed', 'cancelled'].includes(r.status)).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filter === f ? 'bg-bpjs-green text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {f === 'all' ? `Semua (${count})` : f === 'active' ? `Aktif (${count})` : `Selesai (${count})`}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-3">Belum ada permintaan magang.</p>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 bg-bpjs-green text-white font-medium px-4 py-2 rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" /> Buat Permintaan Pertama
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((req) => {
            const meta = STATUS_META[req.status];
            const StatusIcon = meta.icon;
            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setDetailId(req.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{req.request_title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.color}`}>
                        <StatusIcon className="w-3 h-3" /> {meta.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {req.school_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-bpjs-green" /> {req.requested_slots} peserta
                      </span>
                      {req.proposed_start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-bpjs-blue" />
                          {new Date(req.proposed_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {req.proposed_end_date && ` → ${new Date(req.proposed_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </span>
                      )}
                      <span className="text-gray-400">
                        Dikirim {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {req.status === 'accepted' && req.accepted_slots && (
                      <div className="mt-2 text-xs bg-green-50 text-green-800 px-2 py-1 rounded inline-block">
                        ✓ Diterima: {req.accepted_slots} slot
                        {req.assigned_departments && ` • ${req.assigned_departments}`}
                      </div>
                    )}
                    {req.status === 'rejected' && req.review_notes && (
                      <div className="mt-2 text-xs bg-red-50 text-red-700 px-2 py-1 rounded inline-block max-w-full truncate">
                        Alasan: {req.review_notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <RequestFormModal
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSuccess={() => { setShowForm(false); setEditing(null); fetchRequests(); }}
        />
      )}
    </div>
    </SecurityWrapper>
  );
}

// ============================================================
// StatChip
// ============================================================
function StatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// ============================================================
// RequestDetail
// ============================================================
function RequestDetail({ requestId, onBack, onRefresh }: { requestId: string; onBack: () => void; onRefresh: () => void }) {
  const [data, setData] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bkk/requests/${requestId}`);
      const d = await res.json();
      if (d.success) setData(d.request);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleCancel = async () => {
    if (!confirm('Yakin batalkan permintaan ini? Tindakan tidak bisa dibatalkan.')) return;
    setCancelling(true);
    try {
      await fetch(`/api/bkk/requests/${requestId}`, { method: 'DELETE' });
      onRefresh();
      onBack();
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  if (!data) return null;
  const meta = STATUS_META[data.status];
  const StatusIcon = meta.icon;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-gray-500 hover:text-bpjs-green text-sm">
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-bpjs-green" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {data.request_title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.color}`}>
                <StatusIcon className="w-3 h-3" /> {meta.label}
              </span>
              <span className="text-xs text-gray-500">{meta.desc}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {data.school_name}
            </p>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-bpjs-green" /> Penempatan Diminta
          </h3>
          <DetailRow label="Jumlah Peserta" value={`${data.requested_slots} peserta`} />
          {data.proposed_start_date && (
            <DetailRow label="Tanggal Mulai Diajukan" value={new Date(data.proposed_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
          )}
          {data.proposed_end_date && (
            <DetailRow label="Tanggal Selesai Diajukan" value={new Date(data.proposed_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
          )}
          {data.requested_majors && <DetailRow label="Jurusan Diminta" value={data.requested_majors} />}
          {data.requested_departments && <DetailRow label="Departemen Diminta" value={data.requested_departments} />}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-bpjs-blue" /> Kontak Pengirim
          </h3>
          {data.contact_person && <DetailRow label="Narahubung" value={data.contact_person} />}
          {data.contact_phone && <DetailRow label="Telepon" value={data.contact_phone} />}
          {data.contact_email && <DetailRow label="Email" value={data.contact_email} />}
          <DetailRow label="Dikirim Pada" value={new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
          {data.attachment_url && (
            <a
              href={data.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs bg-bpjs-blue text-white px-3 py-1.5 rounded-lg font-medium"
            >
              <ExternalLink className="w-3 h-3" /> Lihat Surat Pengantar
            </a>
          )}
        </div>
      </div>

      {/* Cover letter */}
      {data.cover_letter && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Mail className="w-4 h-4 text-bpjs-green" /> Surat Pengantar
          </h3>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{data.cover_letter}</p>
        </div>
      )}

      {/* Additional notes */}
      {data.additional_notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-900 mb-1 text-sm">Catatan Tambahan</h3>
          <p className="text-sm text-blue-800 whitespace-pre-line">{data.additional_notes}</p>
        </div>
      )}

      {/* Admin response — if reviewed */}
      {data.reviewed_at && (
        <div className={`rounded-xl border p-5 ${
          data.status === 'accepted' ? 'bg-green-50 border-green-200' :
          data.status === 'rejected' ? 'bg-red-50 border-red-200' :
          data.status === 'completed' ? 'bg-bpjs-green/10 border-bpjs-green/30' :
          'bg-amber-50 border-amber-200'
        }`}>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Tanggapan Admin BPJTK
          </h3>
          <div className="space-y-2 text-sm">
            <DetailRow label="Ditinjau Pada" value={new Date(data.reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            {data.status === 'accepted' && data.accepted_slots && (
              <DetailRow label="Jumlah Diterima" value={`${data.accepted_slots} peserta`} />
            )}
            {data.actual_start_date && (
              <DetailRow label="Mulai Ditetapkan" value={new Date(data.actual_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {data.actual_end_date && (
              <DetailRow label="Selesai Ditetapkan" value={new Date(data.actual_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />
            )}
            {data.assigned_departments && <DetailRow label="Departemen Penempatan" value={data.assigned_departments} />}
            {data.review_notes && (
              <div>
                <p className="text-xs text-gray-500 mt-2">Catatan Admin:</p>
                <p className="text-gray-800 mt-1 whitespace-pre-line">{data.review_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {['submitted', 'under_review', 'draft'].includes(data.status) && (
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Batalkan Permintaan
          </button>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-xs text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value}</span>
    </div>
  );
}

// ============================================================
// RequestFormModal — Create / Edit
// ============================================================
function RequestFormModal({ editing, onClose, onSuccess }: { editing: Request | null; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    school_name: editing?.school_name || '',
    request_title: editing?.request_title || '',
    contact_person: editing?.contact_person || '',
    contact_phone: editing?.contact_phone || '',
    contact_email: editing?.contact_email || '',
    requested_slots: editing?.requested_slots?.toString() || '1',
    proposed_start_date: editing?.proposed_start_date || '',
    proposed_end_date: editing?.proposed_end_date || '',
    requested_majors: editing?.requested_majors || '',
    requested_departments: editing?.requested_departments || '',
    cover_letter: editing?.cover_letter || '',
    additional_notes: editing?.additional_notes || '',
    attachment_url: editing?.attachment_url || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/bkk/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-bpjs-green" /> {editing ? 'Edit Permintaan Magang' : 'Ajukan Permintaan Magang'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* School & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Sekolah / Institusi *" required>
              <input
                type="text"
                value={form.school_name}
                onChange={(e) => set('school_name', e.target.value)}
                placeholder="Contoh: SMK Negeri 1 Cirebon"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
            <Field label="Judul Permintaan *" required>
              <input
                type="text"
                value={form.request_title}
                onChange={(e) => set('request_title', e.target.value)}
                placeholder="Contoh: Permintaan Magang Semester Ganjil 2026/2027"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
          </div>

          {/* Slots & dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Jumlah Peserta *" required>
              <input
                type="number"
                min={1}
                max={100}
                value={form.requested_slots}
                onChange={(e) => set('requested_slots', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
            <Field label="Tanggal Mulai Diajukan">
              <input
                type="date"
                value={form.proposed_start_date}
                onChange={(e) => set('proposed_start_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
            <Field label="Tanggal Selesai Diajukan">
              <input
                type="date"
                value={form.proposed_end_date}
                onChange={(e) => set('proposed_end_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
          </div>

          {/* Majors & departments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Jurusan yang Diminta" hint="Pisahkan dengan koma, contoh: RPL, TKJ, Akuntansi">
              <input
                type="text"
                value={form.requested_majors}
                onChange={(e) => set('requested_majors', e.target.value)}
                placeholder="RPL, TKJ, Akuntansi"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
            <Field label="Departemen Tujuan" hint="Pelayanan, Pemasaran, Keuangan (boleh kombinasi)">
              <input
                type="text"
                value={form.requested_departments}
                onChange={(e) => set('requested_departments', e.target.value)}
                placeholder="Pelayanan, Pemasaran"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Narahubung">
              <input
                type="text"
                value={form.contact_person}
                onChange={(e) => set('contact_person', e.target.value)}
                placeholder="Nama pembimbing"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
            <Field label="Telepon">
              <input
                type="text"
                value={form.contact_phone}
                onChange={(e) => set('contact_phone', e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form.contact_email}
                onChange={(e) => set('contact_email', e.target.value)}
                placeholder="bkk@sekolah.sch.id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
            </Field>
          </div>

          {/* Cover letter */}
          <Field label="Surat Pengantar" hint="Tulis surat pengantar singkat. Untuk surat resmi, isi URL pada field di bawah.">
            <textarea
              value={form.cover_letter}
              onChange={(e) => set('cover_letter', e.target.value)}
              rows={4}
              placeholder="Dengan hormat, sehubungan dengan program magang industri..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
            />
          </Field>

          <Field label="URL Surat Resmi (opsional)" hint="Link Google Drive / Dropbox untuk surat resmi kepala sekolah">
            <input
              type="url"
              value={form.attachment_url}
              onChange={(e) => set('attachment_url', e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
            />
          </Field>

          <Field label="Catatan Tambahan (opsional)">
            <textarea
              value={form.additional_notes}
              onChange={(e) => set('additional_notes', e.target.value)}
              rows={2}
              placeholder="Catatan khusus untuk admin BPJTK"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
            />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">
            Batal
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Kirim Permintaan
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}
