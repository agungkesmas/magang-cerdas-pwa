'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Loader2,
  Search,
  Edit2,
  Archive,
  Ban,
  X,
  Clock,
  Zap,
  Users,
  RefreshCw
} from 'lucide-react';

interface QuestItem {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  xp_reward: number;
  max_slots: number | null;
  current_slots_taken: number;
  is_active: boolean;
  is_archived: boolean;
  is_recurring: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  edited_at: string | null;
  archived_at: string | null;
  group_id: string;
  group_name: string;
  group_department: string | null;
  pembina_name: string | null;
  pembina_code: string | null;
  participants_count: number;
  completed_count: number;
  derived_status: 'active' | 'archived' | 'expired' | 'inactive';
  is_overdue: boolean;
}

type FilterStatus = 'all' | 'active' | 'archived' | 'expired';

export default function PembinaQuestsPage() {
  const [quests, setQuests] = useState<QuestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ type: 'archive' | 'forceCancel'; quest: QuestItem } | null>(null);
  const [editQuest, setEditQuest] = useState<QuestItem | null>(null);
  const [forceCancelReason, setForceCancelReason] = useState('');

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      // mine=1 → hanya quest milik pembina ini
      const res = await fetch(`/api/quests/list?status=${filter}&mine=1`);
      const data = await res.json();
      if (data.success) setQuests(data.quests || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchQuests(); }, [fetchQuests]);

  const handleArchive = async (quest: QuestItem) => {
    setActionLoading(quest.id);
    setError('');
    try {
      const res = await fetch(`/api/quests/${quest.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Archived from pembina quests page' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmAction(null);
      await fetchQuests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceCancel = async (quest: QuestItem, reason: string) => {
    setActionLoading(quest.id);
    setError('');
    try {
      const res = await fetch(`/api/quests/${quest.id}/force-cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfirmAction(null);
      setForceCancelReason('');
      await fetchQuests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = quests.filter((q) => {
    const s = search.toLowerCase();
    return !s || q.title.toLowerCase().includes(s) || q.group_name?.toLowerCase().includes(s);
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-bpjs-green/10 text-bpjs-green',
      archived: 'bg-gray-200 text-gray-600',
      expired: 'bg-red-100 text-red-700',
      inactive: 'bg-orange-100 text-orange-700'
    };
    const labels: Record<string, string> = {
      active: 'Aktif',
      archived: 'Diarsipkan',
      expired: 'Lewat Deadline',
      inactive: 'Nonaktif'
    };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || styles.inactive}`}>{labels[status] || status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Quest Saya
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Kelola quest yang sudah Anda deploy • {quests.length} quest total
          </p>
        </div>
        <button
          onClick={fetchQuests}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Info banner: pembina tidak bisa hapus permanen */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        ℹ️ Sebagai pembina, Anda bisa <strong>Edit</strong>, <strong>Arsipkan</strong>, dan <strong>Batalkan peserta in-progress</strong> untuk quest yang Anda deploy. Hapus permanen hanya bisa oleh Admin.
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'active', 'expired', 'archived'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium ${
                filter === f ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : f === 'expired' ? 'Lewat Deadline' : 'Diarsipkan'}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari judul atau grup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
          />
        </div>
      </div>

      {/* Quest list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          <Target className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          Belum ada quest. Deploy quest baru dari menu <strong>Chat Grup</strong>.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className={`bg-white rounded-xl border p-4 ${q.is_archived ? 'border-gray-200 opacity-75' : 'border-gray-200'}`}>
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold flex items-center gap-1">
                      <Target className="w-3 h-3" /> QUEST
                    </span>
                    {statusBadge(q.derived_status)}
                    {q.is_recurring && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">🔁 Berulang</span>}
                    <h3 className="font-bold text-gray-900">{q.title}</h3>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">{q.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-bpjs-yellow" />{q.xp_reward} XP</span>
                    {q.due_date && (
                      <span className={`flex items-center gap-1 ${q.is_overdue ? 'text-red-600' : ''}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(q.due_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{q.participants_count} peserta</span>
                    <span>✓ {q.completed_count} selesai</span>
                    {q.max_slots && <span>Slot: {q.current_slots_taken}/{q.max_slots}</span>}
                    <span className="text-gray-400">•</span>
                    <span>{q.group_name}</span>
                    {q.edited_at && <span className="text-gray-400">• Edited {new Date(q.edited_at).toLocaleDateString('id-ID')}</span>}
                  </div>
                </div>

                {/* Action buttons — pembina: Edit, Force-Cancel, Archive (no delete) */}
                <div className="flex items-center gap-1 flex-wrap">
                  {!q.is_archived && (
                    <>
                      <button
                        onClick={() => setEditQuest(q)}
                        disabled={actionLoading === q.id}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
                        title="Edit quest"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {q.participants_count > 0 && (
                        <button
                          onClick={() => setConfirmAction({ type: 'forceCancel', quest: q })}
                          disabled={actionLoading === q.id}
                          className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md"
                          title="Batalkan peserta in-progress"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmAction({ type: 'archive', quest: q })}
                        disabled={actionLoading === q.id}
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
                        title="Arsipkan"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archive confirm */}
      {confirmAction?.type === 'archive' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Archive className="w-5 h-5" /> Arsipkan Quest</h3>
              <button onClick={() => setConfirmAction(null)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">Quest <strong>&ldquo;{confirmAction.quest.title}&rdquo;</strong> akan disembunyikan dari peserta baru. EXP peserta yang sudah ambil tetap aman.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmAction(null)} disabled={actionLoading === confirmAction.quest.id} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
                <button onClick={() => handleArchive(confirmAction.quest)} disabled={actionLoading === confirmAction.quest.id} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
                  {actionLoading === confirmAction.quest.id && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />} Arsipkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Force-cancel confirm */}
      {confirmAction?.type === 'forceCancel' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-orange-700 flex items-center gap-2"><Ban className="w-5 h-5" /> Batalkan Peserta In-Progress</h3>
              <button onClick={() => { setConfirmAction(null); setForceCancelReason(''); }} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">Batalkan semua peserta in-progress pada quest <strong>&ldquo;{confirmAction.quest.title}&rdquo;</strong>? EXP tidak akan diberikan ke peserta yang belum submit.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan (wajib, min 5 karakter) *</label>
                <textarea
                  rows={3}
                  value={forceCancelReason}
                  onChange={(e) => setForceCancelReason(e.target.value)}
                  placeholder="Misal: Quest salah total, ada bug di instruksi"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setConfirmAction(null); setForceCancelReason(''); }} disabled={actionLoading === confirmAction.quest.id} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50">Batal</button>
                <button onClick={() => handleForceCancel(confirmAction.quest, forceCancelReason)} disabled={actionLoading === confirmAction.quest.id || forceCancelReason.trim().length < 5} className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
                  {actionLoading === confirmAction.quest.id && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />} Batalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editQuest && (
        <EditInlineModal quest={editQuest} onClose={() => setEditQuest(null)} onSuccess={() => { setEditQuest(null); fetchQuests(); }} />
      )}
    </div>
  );
}

function EditInlineModal({ quest, onClose, onSuccess }: { quest: QuestItem; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: quest.title,
    description: quest.description,
    deadline: quest.due_date ? new Date(quest.due_date).toISOString().slice(0, 10) : '',
    deadline_time: quest.due_date ? new Date(quest.due_date).toISOString().slice(11, 16) : '17:00',
    max_slots: quest.max_slots ? String(quest.max_slots) : ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const xpLocked = quest.participants_count > 0;
  const titleLocked = quest.completed_count > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let deadlineISO: string | null = null;
      if (form.deadline) {
        deadlineISO = new Date(`${form.deadline}T${form.deadline_time}:00`).toISOString();
      }
      const res = await fetch(`/api/quests/${quest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          deadline: deadlineISO,
          max_slots: form.max_slots ? parseInt(form.max_slots, 10) : null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Edit2 className="w-5 h-5 text-purple-600" /> Edit Quest</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={titleLocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 disabled:bg-gray-100 disabled:text-gray-500" />
            {titleLocked && <p className="text-xs text-orange-600 mt-1">Judul terkunci — sudah ada peserta completed.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XP</label>
              <input value={`${quest.xp_reward} XP`} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-500 bg-gray-100" />
              {xpLocked && <p className="text-xs text-orange-600 mt-1">XP terkunci (anti-fraud).</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slot Maksimum</label>
              <input type="number" min={1} value={form.max_slots} onChange={(e) => setForm({ ...form, max_slots: e.target.value })}
                placeholder="kosong = tak terbatas" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
              <select value={form.deadline_time} onChange={(e) => setForm({ ...form, deadline_time: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                {['12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-sm disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : <Edit2 className="w-4 h-4 inline mr-1" />} Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
