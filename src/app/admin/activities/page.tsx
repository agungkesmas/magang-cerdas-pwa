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
  Calendar,
  AlertCircle
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  intern_id: string | null;
  department: string | null;
  due_date: string | null;
  is_active: boolean;
  completed_by_intern_id: string | null;
  completed_at: string | null;
  created_at: string;
  assigned_intern_name: string | null;
  completions: { intern_id: string; intern_name: string; completed_at: string }[];
  completion_count: number;
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
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, iRes] = await Promise.all([
        fetch('/api/activities/list'),
        fetch('/api/interns/list')
      ]);
      const aData = await aRes.json();
      const iData = await iRes.json();
      if (aData.success) setActivities(aData.activities);
      if (iData.success) setInterns(iData.interns.filter((i: Intern) => i.is_active));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus aktivitas "${title}"?`)) return;
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
            {activities.length} aktivitas • {activities.filter((a) => !a.completed_by_intern_id && a.completion_count === 0).length} belum selesai
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
          <p className="text-gray-500">Belum ada aktivitas. Assign aktivitas pertama ke peserta magang.</p>
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
                      {act.intern_id ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium flex items-center gap-1">
                          <User className="w-3 h-3" /> {act.assigned_intern_name || 'Peserta'}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium flex items-center gap-1">
                          <Users className="w-3 h-3" /> {act.department}
                        </span>
                      )}
                      {act.due_date && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                          isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? 'Lewat deadline' : `Deadline: ${new Date(act.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{act.description}</p>

                    {/* Completion info untuk mode department */}
                    {!act.intern_id && act.completions.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">Diselesaikan oleh ({act.completion_count}):</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {act.completions.map((c) => (
                            <span key={c.intern_id} className="text-xs px-2 py-0.5 bg-bpjs-green/10 text-bpjs-green rounded-full">
                              {c.intern_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(act.id, act.title)}
                    title="Hapus aktivitas"
                    className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
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
    </div>
  );
}

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
    due_date: ''
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
      const body: any = {
        title: form.title,
        description: form.description,
        due_date: form.due_date || undefined
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Aktivitas *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Verifikasi 10 dokumen JHT"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Buka sistem JMO, cari dokumen JHT tanggal hari ini, verifikasi kelengkapannya..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Tulis instruksi konkret yang mudah dipahami peserta magang
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign ke *</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, assignMode: 'department', intern_id: '' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.assignMode === 'department' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5 mb-1 text-purple-600" />
                <div className="font-semibold text-sm text-gray-900">Seluruh Departemen</div>
                <div className="text-xs text-gray-500">Semua peserta di departemen</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, assignMode: 'intern' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.assignMode === 'intern' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-5 h-5 mb-1 text-blue-600" />
                <div className="font-semibold text-sm text-gray-900">Peserta Spesifik</div>
                <div className="text-xs text-gray-500">Pilih 1 peserta</div>
              </button>
            </div>

            {form.assignMode === 'department' ? (
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40 bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40 bg-white mb-2"
                >
                  <option value="Pelayanan">Pelayanan</option>
                  <option value="Pemasaran">Pemasaran</option>
                  <option value="Keuangan">Keuangan</option>
                </select>
                <select
                  required={form.assignMode === 'intern'}
                  value={form.intern_id}
                  onChange={(e) => setForm({ ...form, intern_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40 bg-white"
                >
                  <option value="" disabled>-- Pilih Peserta --</option>
                  {filteredInterns.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.major})
                    </option>
                  ))}
                </select>
                {filteredInterns.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Tidak ada peserta aktif di departemen {form.department}</p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (opsional)</label>
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Assign Aktivitas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
