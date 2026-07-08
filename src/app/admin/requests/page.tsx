'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Inbox,
  Loader2,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Users,
  Building2,
  FileText,
  Mail,
  Send,
  PartyPopper,
  MessageSquare,
  ExternalLink,
  Search,
  Check,
  UserCheck,
  Paperclip,
  Download
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
  student_list_url?: string | null;
  status: 'draft' | 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  review_notes: string | null;
  accepted_slots: number | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  assigned_departments: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  bkk_teachers: { name: string; email: string; phone: string };
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  submitted: { label: 'Terkirim', color: 'bg-blue-100 text-blue-700', icon: Send },
  under_review: { label: 'Direview', color: 'bg-amber-100 text-amber-800', icon: Eye },
  accepted: { label: 'Diterima', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-700', icon: XCircle },
  completed: { label: 'Selesai', color: 'bg-bpjs-green/20 text-bpjs-green-dark', icon: PartyPopper },
  cancelled: { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-500', icon: XCircle }
};

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter !== 'all' ? `/api/admin/requests?status=${filter}` : '/api/admin/requests';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRequests(data.requests);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = {
    submitted: requests.filter((r) => r.status === 'submitted').length,
    under_review: requests.filter((r) => r.status === 'under_review').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
    completed: requests.filter((r) => r.status === 'completed').length
  };

  const filtered = requests.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.school_name.toLowerCase().includes(s) ||
      r.request_title.toLowerCase().includes(s) ||
      (r.bkk_teachers?.name || '').toLowerCase().includes(s);
  });

  if (detailId) {
    return <RequestDetail requestId={detailId} onBack={() => setDetailId(null)} onRefresh={fetchRequests} />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Permintaan Magang Masuk
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Review dan tindak lanjut permohonan magang dari BKK sekolah mitra
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatChip icon={Send} label="Menunggu Review" value={stats.submitted} color="bg-blue-50 text-blue-700" />
        <StatChip icon={Eye} label="Sedang Direview" value={stats.under_review} color="bg-amber-50 text-amber-800" />
        <StatChip icon={CheckCircle2} label="Diterima" value={stats.accepted} color="bg-green-50 text-green-800" />
        <StatChip icon={PartyPopper} label="Selesai" value={stats.completed} color="bg-bpjs-green/10 text-bpjs-green-dark" />
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 flex-wrap">
          {[
            { v: 'all', label: 'Semua' },
            { v: 'submitted', label: 'Menunggu' },
            { v: 'under_review', label: 'Direview' },
            { v: 'accepted', label: 'Diterima' },
            { v: 'rejected', label: 'Ditolak' },
            { v: 'completed', label: 'Selesai' }
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filter === f.v ? 'bg-bpjs-blue text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari sekolah, judul, atau pengirim..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada permintaan pada filter ini.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((req) => {
            const meta = STATUS_META[req.status];
            const StatusIcon = meta.icon;
            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bpjs-blue/30 transition-all cursor-pointer"
                onClick={() => setDetailId(req.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{req.request_title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.color}`}>
                        <StatusIcon className="w-3 h-3" /> {meta.label}
                      </span>
                      {req.status === 'submitted' && (
                        <span className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium animate-pulse">
                          Baru
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                      <Building2 className="w-3 h-3" /> {req.school_name}
                      <span>•</span>
                      <UserCheck className="w-3 h-3" /> {req.bkk_teachers?.name || '—'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-bpjs-blue" /> {req.requested_slots} peserta
                      </span>
                      {req.proposed_start_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-bpjs-blue" />
                          {new Date(req.proposed_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          {req.proposed_end_date && ` → ${new Date(req.proposed_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {new Date(req.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    {req.status === 'accepted' && req.accepted_slots && (
                      <div className="mt-2 text-xs bg-green-50 text-green-800 px-2 py-1 rounded inline-block">
                        ✓ {req.accepted_slots} slot diterima {req.assigned_departments && `• ${req.assigned_departments}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Klik untuk detail</div>
                    <ChevronLeft className="w-4 h-4 ml-auto rotate-180 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
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
// RequestDetail — Admin can respond
// ============================================================
function RequestDetail({ requestId, onBack, onRefresh }: { requestId: string; onBack: () => void; onRefresh: () => void }) {
  const [data, setData] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRespondModal, setShowRespondModal] = useState<'review' | 'accept' | 'reject' | 'complete' | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`);
      const d = await res.json();
      if (d.success) setData(d.request);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleAction = async (action: 'review' | 'accept' | 'reject' | 'complete', payload: any = {}) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setShowRespondModal(null);
      fetchDetail();
      onRefresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" /></div>;
  }
  if (!data) return null;
  const meta = STATUS_META[data.status];
  const StatusIcon = meta.icon;

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-gray-500 hover:text-bpjs-blue text-sm">
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-bpjs-blue/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-6 h-6 text-bpjs-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {data.request_title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${meta.color}`}>
                <StatusIcon className="w-3 h-3" /> {meta.label}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {data.school_name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BKK Teacher contact info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-bpjs-blue" /> Pengirim (BKK)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <DetailRow label="Nama BKK" value={data.bkk_teachers?.name || '-'} />
          <DetailRow label="Email BKK" value={data.bkk_teachers?.email || '-'} />
          {data.contact_person && <DetailRow label="Narahubung Sekolah" value={data.contact_person} />}
          {data.contact_phone && <DetailRow label="Telepon" value={data.contact_phone} />}
          {data.contact_email && <DetailRow label="Email Sekolah" value={data.contact_email} />}
          <DetailRow label="Dikirim Pada" value={new Date(data.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
        </div>
      </div>

      {/* Requested placement */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-bpjs-green" /> Penempatan Diminta
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <DetailRow label="Jumlah Peserta" value={`${data.requested_slots} peserta`} />
          {data.proposed_start_date && <DetailRow label="Mulai Diajukan" value={new Date(data.proposed_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
          {data.proposed_end_date && <DetailRow label="Selesai Diajukan" value={new Date(data.proposed_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
          {data.requested_majors && <DetailRow label="Jurusan Diminta" value={data.requested_majors} />}
          {data.requested_departments && <DetailRow label="Departemen Diminta" value={data.requested_departments} />}
          {data.attachment_url && (
            <div className="sm:col-span-2">
              <a href={data.attachment_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs bg-bpjs-blue text-white px-3 py-1.5 rounded-lg font-medium">
                <ExternalLink className="w-3 h-3" /> Lihat Surat Pengantar Resmi
              </a>
            </div>
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

      {data.additional_notes && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-900 mb-1 text-sm">Catatan Tambahan dari BKK</h3>
          <p className="text-sm text-blue-800 whitespace-pre-line">{data.additional_notes}</p>
        </div>
      )}

      {/* Admin response — if already reviewed */}
      {data.reviewed_at && (
        <div className={`rounded-xl border p-5 ${
          data.status === 'accepted' ? 'bg-green-50 border-green-200' :
          data.status === 'rejected' ? 'bg-red-50 border-red-200' :
          data.status === 'completed' ? 'bg-bpjs-green/10 border-bpjs-green/30' :
          'bg-amber-50 border-amber-200'
        }`}>
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Tanggapan Anda
          </h3>
          <div className="space-y-2 text-sm">
            <DetailRow label="Ditinjau Pada" value={new Date(data.reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
            {data.accepted_slots && <DetailRow label="Jumlah Diterima" value={`${data.accepted_slots} peserta`} />}
            {data.actual_start_date && <DetailRow label="Mulai Ditetapkan" value={new Date(data.actual_start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
            {data.actual_end_date && <DetailRow label="Selesai Ditetapkan" value={new Date(data.actual_end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} />}
            {data.assigned_departments && <DetailRow label="Departemen Penempatan" value={data.assigned_departments} />}
            {data.review_notes && (
              <div>
                <p className="text-xs text-gray-500 mt-2">Catatan:</p>
                <p className="text-gray-800 mt-1 whitespace-pre-line">{data.review_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons — depends on current status */}
      <div className="flex flex-wrap gap-2">
        {data.status === 'submitted' && (
          <button
            onClick={() => setShowRespondModal('review')}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-4 py-2.5 rounded-lg"
          >
            <Eye className="w-4 h-4" /> Mulai Review
          </button>
        )}
        {['submitted', 'under_review'].includes(data.status) && (
          <>
            <button
              onClick={() => setShowRespondModal('accept')}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-lg"
            >
              <Check className="w-4 h-4" /> Terima
            </button>
            <button
              onClick={() => setShowRespondModal('reject')}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2.5 rounded-lg"
            >
              <XCircle className="w-4 h-4" /> Tolak
            </button>
          </>
        )}
        {data.status === 'accepted' && (
          <button
            onClick={() => setShowRespondModal('complete')}
            className="inline-flex items-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold px-4 py-2.5 rounded-lg"
          >
            <PartyPopper className="w-4 h-4" /> Tandai Selesai
          </button>
        )}
      </div>

      {/* Action modal */}
      {showRespondModal && (
        <RespondModal
          action={showRespondModal}
          request={data}
          loading={actionLoading}
          onClose={() => setShowRespondModal(null)}
          onSubmit={(payload) => handleAction(showRespondModal, payload)}
        />
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
// RespondModal
// ============================================================
function RespondModal({ action, request, loading, onClose, onSubmit }: {
  action: 'review' | 'accept' | 'reject' | 'complete';
  request: Request;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}) {
  const [reviewNotes, setReviewNotes] = useState('');
  const [acceptedSlots, setAcceptedSlots] = useState(request.requested_slots.toString());
  const [actualStart, setActualStart] = useState(request.proposed_start_date || '');
  const [actualEnd, setActualEnd] = useState(request.proposed_end_date || '');
  const [assignedDepts, setAssignedDepts] = useState(request.requested_departments || '');

  const title = {
    review: 'Mulai Review Permintaan',
    accept: 'Terima Permintaan Magang',
    reject: 'Tolak Permintaan',
    complete: 'Tandai Magang Selesai'
  }[action];

  // Default reply templates
  const defaultReplies: Record<string, string> = {
    accept: `Permintaan magang DITERIMA. ${request.accepted_slots || acceptedSlots} slot telah disetujui.\n\nLangkah selanjutnya untuk BKK:\n1. Buka menu "Peserta Magang" untuk lihat/daftarkan siswa\n2. Klik "Batch Upload" untuk upload daftar siswa via Excel\n3. Download/print Kartu Kredensial (username + password per siswa)\n4. Bagikan kartu ke masing-masing siswa\n5. Siswa login di /intern/login dan check-in di hari pertama\n\nTanggal & departemen penempatan dapat ditentukan nanti oleh admin.`,
    reject: `Mohon maaf, permintaan magang DITOLAK. `,
    review: `Permintaan magang sedang direview. Mohon tunggu konfirmasi selanjutnya.`,
    complete: `Magang telah ditandai SELESAI. Terima kasih atas kerjasamanya.`,
  };

  const useDefaultReply = () => setReviewNotes(defaultReplies[action] || '');

  const submit = () => {
    const payload: any = {};
    if (reviewNotes.trim()) payload.review_notes = reviewNotes.trim();
    if (action === 'accept') {
      payload.accepted_slots = parseInt(acceptedSlots, 10);
      if (actualStart) payload.actual_start_date = actualStart;
      if (actualEnd) payload.actual_end_date = actualEnd;
      if (assignedDepts.trim()) payload.assigned_departments = assignedDepts.trim();
    }
    if (action === 'reject' && !reviewNotes.trim()) {
      alert('Alasan penolakan wajib diisi');
      return;
    }
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{request.school_name}</p>
            <p className="font-semibold text-sm text-gray-900">{request.request_title}</p>
            <p className="text-xs text-gray-600 mt-1">{request.requested_slots} peserta diminta</p>
            {/* Links to surat & Excel siswa */}
            <div className="mt-2 flex gap-3 flex-wrap">
              {request.attachment_url && (
                <a href={request.attachment_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-bpjs-blue hover:underline flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Surat Resmi (PDF)
                </a>
              )}
              {request.student_list_url && (
                <a href={request.student_list_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-bpjs-green hover:underline flex items-center gap-1">
                  <Download className="w-3 h-3" /> Daftar Siswa (Excel)
                </a>
              )}
            </div>
          </div>

          {action === 'accept' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Jumlah Slot Diterima</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={acceptedSlots}
                  onChange={(e) => setAcceptedSlots(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Mulai <span className="text-gray-400 font-normal">(opsional — bisa nanti)</span>
                  </label>
                  <input type="date" value={actualStart} onChange={(e) => setActualStart(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tanggal Selesai <span className="text-gray-400 font-normal">(opsional — bisa nanti)</span>
                  </label>
                  <input type="date" value={actualEnd} onChange={(e) => setActualEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Departemen Penempatan <span className="text-gray-400 font-normal">(opsional — bisa nanti)</span>
                </label>
                <select
                  value={assignedDepts}
                  onChange={(e) => setAssignedDepts(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
                >
                  <option value="">— Belum Ditempatkan —</option>
                  <option value="Pelayanan">Pelayanan</option>
                  <option value="Pemasaran">Pemasaran</option>
                  <option value="Keuangan">Keuangan</option>
                  <option value="Pelayanan, Pemasaran">Pelayanan & Pemasaran</option>
                  <option value="Pelayanan, Keuangan">Pelayanan & Keuangan</option>
                  <option value="Pemasaran, Keuangan">Pemasaran & Keuangan</option>
                  <option value="Pelayanan, Pemasaran, Keuangan">Semua Departemen</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Bisa dikosongkan — assign nanti via menu Peserta Magang
                </p>
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700">
                {action === 'reject' ? 'Alasan Penolakan *' : 'Balasan ke BKK'}
              </label>
              <button
                type="button"
                onClick={useDefaultReply}
                className="text-[10px] text-bpjs-blue hover:underline"
              >
                📝 Gunakan Template
              </button>
            </div>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={5}
              placeholder={
                action === 'reject' ? 'Jelaskan alasan penolakan...' :
                action === 'accept' ? 'Balasan ke BKK (klik "Gunakan Template" untuk isi otomatis)...' :
                'Catatan tambahan...'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">Batal</button>
          <button
            onClick={submit}
            disabled={loading}
            className={`inline-flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50 ${
              action === 'reject' ? 'bg-red-500 hover:bg-red-600' :
              action === 'accept' ? 'bg-green-600 hover:bg-green-700' :
              action === 'complete' ? 'bg-bpjs-green hover:bg-bpjs-green-dark' :
              'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {action === 'reject' ? 'Tolak Permintaan' : action === 'accept' ? 'Terima' : action === 'complete' ? 'Selesai' : 'Mulai Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
