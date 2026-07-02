'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Loader2,
  X,
  Clock,
  CheckCircle2,
  Users,
  User,
  AlertCircle,
  Sparkles,
  Wand2,
  Archive,
  RotateCcw,
  Edit
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  intern_id: string | null;
  department: string | null;
  due_date: string | null;
  is_active: boolean;
  is_archived: boolean;
  created_by_intern: boolean;
  completed_by_intern_id: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  created_at: string;
  assigned_intern_name: string | null;
  completions: { intern_id: string; intern_name: string; completed_at: string; completion_notes: string | null }[];
  completion_count: number;
  // Recurring fields
  is_recurring?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  skip_weekend?: boolean;
  daily_deadline_hour?: number;
  daily_completions?: any[];
  today_completion_count?: number;
  is_today_in_range?: boolean;
  working_days_in_range?: number | null;
}

interface Intern {
  id: string;
  name: string;
  major: string;
  department: string;
  username: string;
  is_active: boolean;
}

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [archived, setArchived] = useState<Activity[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [reactivateActivity, setReactivateActivity] = useState<Activity | null>(null);
  const [showReactivateForm, setShowReactivateForm] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, iRes] = await Promise.all([
        fetch('/api/activities/list'),
        fetch('/api/interns/list')
      ]);
      const aData = await aRes.json();
      const iData = await iRes.json();
      if (aData.success) {
        // Split active vs archived client-side
        const all = aData.activities || [];
        setActivities(all.filter((a: Activity) => !a.is_archived));
        setArchived(all.filter((a: Activity) => a.is_archived));
      }
      if (iData.success) setInterns(iData.interns.filter((i: Intern) => i.is_active));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleArchive = async (id: string, title: string) => {
    if (!confirm(`Arsipkan "${title}"? Aktivitas akan disembunyikan dari peserta. Bisa diaktifkan kembali nanti.`)) return;
    setArchiving(id);
    try {
      const res = await fetch('/api/activities/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchAll();
    } finally {
      setArchiving(null);
    }
  };

  const handleReactivate = (act: Activity) => {
    // Buka modal deploy ulang — seperti create baru tapi pre-fill dari arsip
    setReactivateActivity(act);
    setShowReactivateForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus permanen "${title}"?`)) return;
    const res = await fetch(`/api/activities/delete?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Aktivitas Peserta
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {activities.length} aktif • Arsipkan untuk reuse di hari/minggu berikutnya
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" />
          Assign Aktivitas
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada aktivitas aktif.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {activities.map((act) => {
            const isCompleted = !!act.completed_by_intern_id || act.completion_count > 0;
            const isOverdue = act.due_date ? new Date(act.due_date).getTime() < Date.now() : false;
            return (
              <div key={act.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{act.title}</h3>
                      {isCompleted && (
                        <span className="text-xs px-2 py-0.5 bg-bpjs-green/10 text-bpjs-green rounded-full font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selesai
                        </span>
                      )}
                      {act.created_by_intern && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                          Dibuat peserta
                        </span>
                      )}
                      {act.intern_id ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium flex items-center gap-1">
                          <User className="w-3 h-3" /> {act.assigned_intern_name || 'Peserta'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                          <Users className="w-3 h-3" /> {act.department}
                        </span>
                      )}
                      {act.due_date && !act.is_recurring && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? 'Lewat deadline' : new Date(act.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      {act.is_recurring && act.start_date && act.end_date && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          act.is_today_in_range ? 'bg-bpjs-green/10 text-bpjs-green' : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span>🔁</span>
                          {new Date(act.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} → {new Date(act.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          {act.is_today_in_range && ' (aktif hari ini)'}
                        </span>
                      )}
                      {act.is_recurring && act.today_completion_count !== undefined && act.today_completion_count > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-amber-800 rounded-full font-medium">
                          ✓ {act.today_completion_count} selesai hari ini
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{act.description}</p>

                    {/* Completion notes */}
                    {act.completion_notes && (
                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                        📝 Catatan: {act.completion_notes}
                      </div>
                    )}

                    {/* Completion info untuk mode department */}
                    {!act.intern_id && act.completions.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-gray-500 mb-1">Diselesaikan oleh ({act.completion_count}):</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {act.completions.map((c) => (
                            <span key={c.intern_id} className="text-xs px-2 py-0.5 bg-bpjs-green/10 text-bpjs-green rounded-full" title={c.completion_notes || ''}>
                              {c.intern_name}{c.completion_notes ? ' 📝' : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingActivity(act); setShowEditForm(true); }}
                        title="Edit aktivitas"
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(act.id, act.title)}
                        disabled={archiving === act.id}
                        title="Arsipkan (sembunyikan dari peserta, bisa diaktifkan lagi)"
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md disabled:opacity-50"
                      >
                        {archiving === act.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(act.id, act.title)}
                        title="Hapus permanen"
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived section */}
      {archived.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Archive className="w-5 h-5 text-gray-400" />
            Arsip ({archived.length})
          </h2>
          <div className="grid gap-2">
            {archived.map((act) => (
              <div key={act.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3 flex items-center justify-between opacity-70">
                <div>
                  <span className="font-medium text-gray-700 text-sm">{act.title}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {act.intern_id ? act.assigned_intern_name : act.department}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditingActivity(act); setShowEditForm(true); }}
                    title="Edit aktivitas"
                    className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleReactivate(act)}
                    disabled={archiving === act.id}
                    title="Aktifkan kembali (reset completion)"
                    className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md disabled:opacity-50"
                  >
                    {archiving === act.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(act.id, act.title)}
                    className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <ActivityFormModal
          interns={interns}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchAll();
          }}
        />
      )}

      {showEditForm && editingActivity && (
        <EditActivityModal
          activity={editingActivity}
          onClose={() => { setShowEditForm(false); setEditingActivity(null); }}
          onSuccess={() => {
            setShowEditForm(false);
            setEditingActivity(null);
            fetchAll();
          }}
        />
      )}

      {showReactivateForm && reactivateActivity && (
        <ReactivateModal
          activity={reactivateActivity}
          interns={interns}
          onClose={() => { setShowReactivateForm(false); setReactivateActivity(null); }}
          onSuccess={() => {
            setShowReactivateForm(false);
            setReactivateActivity(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

// Reuse ActivityFormModal from previous implementation
function ActivityFormModal({
  interns,
  onClose,
  onSuccess
}: {
  interns: Intern[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assignMode: 'department' as 'department' | 'intern',
    department: 'Pelayanan',
    intern_id: '',
    due_date: '',
    due_time: '16:00',
    // Recurring fields
    is_recurring: false,
    start_date: '',
    end_date: '',
    skip_weekend: true,
    daily_deadline_hour: 17
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeSource, setComposeSource] = useState<'llm' | 'stub' | null>(null);

  const handleCompose = async () => {
    if (!form.title.trim()) { setError('Isi judul dulu'); return; }
    setComposing(true);
    setError('');
    try {
      const res = await fetch('/api/activities/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ ...form, description: data.description });
      setComposeSource(data.source);
    } catch (err: any) {
      setError('AI compose gagal: ' + err.message);
    } finally {
      setComposing(false);
    }
  };

  const filteredInterns = form.department ? interns.filter((i) => i.department === form.department) : interns;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let dueDateISO: string | undefined;
      if (form.due_date) {
        dueDateISO = new Date(`${form.due_date}T${form.due_time}:00`).toISOString();
      }
      const body: any = { title: form.title, description: form.description, due_date: dueDateISO };

      // Recurring fields
      if (form.is_recurring) {
        body.is_recurring = true;
        body.start_date = form.start_date;
        body.end_date = form.end_date;
        body.skip_weekend = form.skip_weekend;
        body.daily_deadline_hour = Number(form.daily_deadline_hour);
      } else {
        body.is_recurring = false;
      }
      if (form.assignMode === 'department') {
        body.department = form.department;
      } else {
        if (!form.intern_id) { setError('Pilih peserta'); setLoading(false); return; }
        body.intern_id = form.intern_id;
      }
      const res = await fetch('/api/activities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900">Assign Aktivitas Baru</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Aktivitas *</label>
            <div className="flex gap-2">
              <input
                required
                value={form.title}
                onChange={(e) => { setForm({ ...form, title: e.target.value }); setComposeSource(null); }}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
                placeholder="Verifikasi 10 dokumen JHT"
              />
              <button
                type="button"
                onClick={handleCompose}
                disabled={composing || !form.title.trim()}
                title="AI generate langkah-langkah dari judul"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-lg disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                {composing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {composing ? '...' : 'Magic ✨'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              Deskripsi *
              {composeSource && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${composeSource === 'llm' ? 'bg-bpjs-green/10 text-bpjs-green' : 'bg-orange-100 text-orange-700'}`}>
                  {composeSource === 'llm' ? '✨ AI' : '📋 Template'}
                </span>
              )}
            </label>
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign ke *</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setForm({ ...form, assignMode: 'department', intern_id: '' })}
                className={`p-3 rounded-lg border text-left ${form.assignMode === 'department' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200'}`}>
                <Users className="w-5 h-5 mb-1 text-purple-600" />
                <div className="font-semibold text-sm">Departemen</div>
              </button>
              <button type="button" onClick={() => setForm({ ...form, assignMode: 'intern' })}
                className={`p-3 rounded-lg border text-left ${form.assignMode === 'intern' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200'}`}>
                <User className="w-5 h-5 mb-1 text-blue-600" />
                <div className="font-semibold text-sm">Peserta Spesifik</div>
              </button>
            </div>
            {form.assignMode === 'department' ? (
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                <option value="Pelayanan">Pelayanan</option>
                <option value="Pemasaran">Pemasaran</option>
                <option value="Keuangan">Keuangan</option>
              </select>
            ) : (
              <>
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, intern_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white mb-2">
                  <option value="Pelayanan">Pelayanan</option>
                  <option value="Pemasaran">Pemasaran</option>
                  <option value="Keuangan">Keuangan</option>
                </select>
                <select required={form.assignMode === 'intern'} value={form.intern_id}
                  onChange={(e) => setForm({ ...form, intern_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                  <option value="" disabled>-- Pilih Peserta --</option>
                  {filteredInterns.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.major})</option>)}
                </select>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mode Aktivitas</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setForm({ ...form, is_recurring: false })}
                className={`p-3 rounded-lg border text-left ${!form.is_recurring ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200'}`}>
                <div className="font-semibold text-sm flex items-center gap-1">📋 Sekali Selesai</div>
                <div className="text-xs text-gray-500 mt-0.5">Intern kerjakan 1x, dapat +20 EXP</div>
              </button>
              <button type="button" onClick={() => setForm({ ...form, is_recurring: true })}
                className={`p-3 rounded-lg border text-left ${form.is_recurring ? 'border-bpjs-green bg-bpjs-green/5' : 'border-gray-200'}`}>
                <div className="font-semibold text-sm flex items-center gap-1">🔁 Harian Berulang</div>
                <div className="text-xs text-gray-500 mt-0.5">Muncul tiap hari di rentang, +20 EXP/hari</div>
              </button>
            </div>
          </div>

          {form.is_recurring ? (
            <div className="bg-bpjs-green/5 border border-bpjs-green/30 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">📅 Rentang Tanggal *</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-500">Mulai</span>
                    <input type="date" required={form.is_recurring} value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500">Selesai</span>
                    <input type="date" required={form.is_recurring} value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                  </div>
                </div>
                {form.start_date && form.end_date && (
                  <p className="text-[10px] text-bpjs-green mt-1">
                    Durasi: {Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000*60*60*24)) + 1} hari kalender
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="skip_weekend" checked={form.skip_weekend}
                  onChange={(e) => setForm({ ...form, skip_weekend: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-bpjs-green focus:ring-bpjs-green" />
                <label htmlFor="skip_weekend" className="text-xs text-gray-700">Skip weekend (Sabtu & Minggu tidak muncul)</label>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">⏰ Deadline Harian (WIB)</label>
                <select value={form.daily_deadline_hour} onChange={(e) => setForm({ ...form, daily_deadline_hour: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                  {[15, 16, 17, 18, 19, 20].map(h => (
                    <option key={h} value={h}>{h}:00 WIB</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-0.5">Intern harus complete sebelum jam ini setiap hari</p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (opsional)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white" />
                <select value={form.due_time} onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white">
                  {['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// EditActivityModal — Edit aktivitas (aktif atau arsip)
// ============================================================
function EditActivityModal({
  activity,
  onClose,
  onSuccess
}: {
  activity: Activity;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: activity.title,
    description: activity.description,
    due_date: activity.due_date ? new Date(activity.due_date).toISOString().slice(0, 10) : '',
    due_time: activity.due_date ? new Date(activity.due_date).toTimeString().slice(0, 5) : '16:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let dueDateISO: string | null = null;
      if (form.due_date) {
        dueDateISO = new Date(`${form.due_date}T${form.due_time}:00`).toISOString();
      }
      const res = await fetch('/api/activities/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activity.id,
          title: form.title,
          description: form.description,
          due_date: dueDateISO
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" /> Edit Aktivitas
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Aktivitas *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={6}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
            <p className="text-xs text-gray-500 mt-1">Edit instruksi sesuai kebutuhan</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (opsional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              />
              <select
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              >
                {['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {activity.is_archived && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              Aktivitas ini sedang diarsip. Edit akan tersimpan, aktivitas tetap diarsip sampai di-reactivate.
            </div>
          )}

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ReactivateModal — Deploy ulang aktivitas arsip sebagai aktivitas BARU
// Admin bisa reassign ke peserta lain, departemen lain, deadline baru
// ============================================================
function ReactivateModal({
  activity,
  interns,
  onClose,
  onSuccess
}: {
  activity: Activity;
  interns: Intern[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: activity.title,
    description: activity.description,
    assignMode: activity.intern_id ? 'intern' as const : 'department' as const,
    department: activity.department || 'Pelayanan',
    intern_id: '',
    due_date: '',
    due_time: '16:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredInterns = form.department
    ? interns.filter((i) => i.department === form.department)
    : interns;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let dueDateISO: string | undefined;
      if (form.due_date) {
        dueDateISO = new Date(`${form.due_date}T${form.due_time}:00`).toISOString();
      }
      const body: any = {
        title: form.title,
        description: form.description,
        due_date: dueDateISO
      };
      if (form.assignMode === 'department') {
        body.department = form.department;
      } else {
        if (!form.intern_id) {
          setError('Pilih peserta magang');
          setLoading(false);
          return;
        }
        body.intern_id = form.intern_id;
      }

      // Create NEW activity (bukan reactivate yang lama)
      const res = await fetch('/api/activities/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-green-600" /> Deploy Ulang Aktivitas
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Aktivitas baru akan dibuat berdasarkan template arsip.</p>
              <p className="mt-0.5">Anda bisa assign ke peserta/departemen yang berbeda, set deadline baru, atau edit judul/deskripsi.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Aktivitas *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign ke *</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, assignMode: 'department', intern_id: '' })}
                className={`p-3 rounded-lg border text-left transition-all ${form.assignMode === 'department' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Users className="w-5 h-5 mb-1 text-purple-600" />
                <div className="font-semibold text-sm text-gray-900">Departemen</div>
                <div className="text-xs text-gray-500">Semua peserta di departemen</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, assignMode: 'intern' })}
                className={`p-3 rounded-lg border text-left transition-all ${form.assignMode === 'intern' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <User className="w-5 h-5 mb-1 text-blue-600" />
                <div className="font-semibold text-sm text-gray-900">Peserta Spesifik</div>
                <div className="text-xs text-gray-500">Pilih 1 peserta (bisa beda dari sebelumnya)</div>
              </button>
            </div>

            {form.assignMode === 'department' ? (
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              >
                <option value="Pelayanan">Pelayanan</option>
                <option value="Pemasaran">Pemasaran</option>
                <option value="Keuangan">Keuangan</option>
              </select>
            ) : (
              <>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value, intern_id: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white mb-2"
                >
                  <option value="Pelayanan">Pelayanan</option>
                  <option value="Pemasaran">Pemasaran</option>
                  <option value="Keuangan">Keuangan</option>
                </select>
                <select
                  required={form.assignMode === 'intern'}
                  value={form.intern_id}
                  onChange={(e) => setForm({ ...form, intern_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                >
                  <option value="" disabled>-- Pilih Peserta (boleh beda dari sebelumnya) --</option>
                  {filteredInterns.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.major})</option>
                  ))}
                </select>
                {filteredInterns.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Tidak ada peserta aktif di departemen {form.department}</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline Baru (opsional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              />
              <select
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
              >
                {['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Deploy Aktivitas Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
