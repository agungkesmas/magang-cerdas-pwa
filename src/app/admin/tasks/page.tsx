'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ListChecks,
  Plus,
  Loader2,
  X,
  Building2,
  Users,
  UserCog,
  UsersRound,
  Calendar,
  Edit,
  Trash2,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  department: string;
  base_description: string;
  target_count: number;
  is_active: boolean;
  mode: 'individual' | 'assigned' | 'team';
  due_date: string | null;
  created_at: string;
  assigned_interns?: { id: string; name: string; major: string; department: string; username: string }[];
  team_progress_entries?: { chunk_index: number; completed_by: string; completed_by_intern_id: string }[];
}

interface Intern {
  id: string;
  name: string;
  major: string;
  department: string;
  username: string;
  is_active: boolean;
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([fetch('/api/tasks/list'), fetch('/api/interns/list')]);
      const tData = await tRes.json();
      const iData = await iRes.json();
      if (tData.success) setTasks(tData.tasks);
      if (iData.success) setInterns(iData.interns.filter((i: Intern) => i.is_active));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = async (task: Task) => {
    const confirmMsg = task.mode === 'team'
      ? `Hapus task "${task.title}"? Progress tim juga akan terhapus.`
      : `Hapus task "${task.title}"? Progress magang yang sudah mengerjakan juga akan terhapus.`;
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`/api/tasks/delete?id=${task.id}&hard=true`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert('Error: ' + data.error);
    } else {
      fetchAll();
    }
  };

  const modeBadge = (mode: string) => {
    if (mode === 'team') return { label: 'Tim', color: 'bg-purple-100 text-purple-700', icon: UsersRound };
    if (mode === 'assigned') return { label: 'Assigned', color: 'bg-blue-100 text-blue-700', icon: UserCog };
    return { label: 'Individu', color: 'bg-gray-100 text-gray-700', icon: Users };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Dynamic Task Builder
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {tasks.length} task aktif • 3 mode: Individu (per departemen), Assigned (pilih magang), Tim (kolaboratif)
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 bg-bpjs-blue hover:bg-bpjs-blue-dark text-white font-semibold px-4 py-2.5 rounded-lg shadow-md"
        >
          <Plus className="w-4 h-4" />
          Buat Tugas Baru
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ListChecks className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada tugas. Buat tugas pertama Anda.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => {
            const badge = modeBadge(task.mode);
            const ModeIcon = badge.icon;
            const teamDone = task.team_progress_entries?.length || 0;
            const totalChunks = Math.max(1, Math.ceil(task.target_count / Math.max(1, Math.ceil(task.target_count / 10))));
            const isOverdue = task.due_date ? new Date(task.due_date).getTime() < Date.now() : false;
            return (
              <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{task.title}</h3>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-medium">
                        {task.department}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${badge.color}`}>
                        <ModeIcon className="w-3 h-3" /> {badge.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        Target: {task.target_count}
                      </span>
                      {task.due_date && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? 'Lewat deadline' : `Deadline: ${new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{task.base_description}</p>

                    {/* Assigned interns / Team members */}
                    {task.assigned_interns && task.assigned_interns.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-1">
                          {task.mode === 'team' ? `Anggota Tim (${task.assigned_interns.length}):` : `Ditugaskan ke (${task.assigned_interns.length}):`}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {task.assigned_interns.map((i) => (
                            <span key={i.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                              {i.name} <span className="text-gray-400">({i.major})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Team progress detail */}
                    {task.mode === 'team' && task.team_progress_entries && task.team_progress_entries.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        Progress tim: {teamDone}/{totalChunks} chunk selesai
                        {task.team_progress_entries.length > 0 && (
                          <span className="ml-2">• Terakhir oleh: {task.team_progress_entries[task.team_progress_entries.length - 1].completed_by}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingTask(task);
                        setShowForm(true);
                      }}
                      title="Edit"
                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task)}
                      title="Hapus"
                      className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskFormModal
          interns={interns}
          editing={editingTask}
          onClose={() => {
            setShowForm(false);
            setEditingTask(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setEditingTask(null);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}

function TaskFormModal({
  interns,
  editing,
  onClose,
  onSuccess
}: {
  interns: Intern[];
  editing: Task | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    title: editing?.title || '',
    department: editing?.department || 'Pelayanan',
    base_description: editing?.base_description || '',
    target_count: editing?.target_count || 50,
    mode: editing?.mode || 'individual',
    due_date: editing?.due_date ? new Date(editing.due_date).toISOString().slice(0, 16) : '',
    assigned_intern_ids: editing?.assigned_interns?.map((i) => i.id) || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleIntern = (id: string) => {
    setForm((f) => ({
      ...f,
      assigned_intern_ids: f.assigned_intern_ids.includes(id)
        ? f.assigned_intern_ids.filter((i) => i !== id)
        : [...f.assigned_intern_ids, id]
    }));
  };

  const filteredInterns = form.mode === 'individual'
    ? []
    : interns.filter((i) => i.department === form.department);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = {
        ...(editing ? {} : {}),
        title: form.title,
        department: form.department,
        base_description: form.base_description,
        target_count: form.target_count,
        mode: form.mode,
        due_date: form.due_date || null,
        assigned_intern_ids: form.mode === 'individual' ? [] : form.assigned_intern_ids
      };

      let res;
      if (editing) {
        res = await fetch('/api/tasks/update', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editing.id, ...body })
        });
      } else {
        res = await fetch('/api/tasks/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }
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
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-bold text-gray-900">
            {editing ? 'Edit Tugas' : 'Buat Tugas Baru'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Tugas *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Verifikasi Klaim JHT di JMO"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departemen *</label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value, assigned_intern_ids: [] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              >
                <option value="Pelayanan">Pelayanan</option>
                <option value="Pemasaran">Pemasaran</option>
                <option value="Keuangan">Keuangan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Count *</label>
              <input
                type="number"
                min={1}
                required
                value={form.target_count}
                onChange={(e) => setForm({ ...form, target_count: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mode Tugas *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'individual', assigned_intern_ids: [] })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.mode === 'individual' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-5 h-5 mb-1 text-gray-600" />
                <div className="font-semibold text-sm text-gray-900">Individu</div>
                <div className="text-xs text-gray-500">Semua magang di departemen</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'assigned' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.mode === 'assigned' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <UserCog className="w-5 h-5 mb-1 text-blue-600" />
                <div className="font-semibold text-sm text-gray-900">Assigned</div>
                <div className="text-xs text-gray-500">Pilih magang spesifik</div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, mode: 'team' })}
                className={`p-3 rounded-lg border text-left transition-all ${
                  form.mode === 'team' ? 'border-bpjs-blue bg-bpjs-blue/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <UsersRound className="w-5 h-5 mb-1 text-purple-600" />
                <div className="font-semibold text-sm text-gray-900">Tim</div>
                <div className="text-xs text-gray-500">Kolaboratif, shared progress</div>
              </button>
            </div>
          </div>

          {form.mode !== 'individual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Magang * ({form.assigned_intern_ids.length} dipilih)
              </label>
              {filteredInterns.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  Tidak ada magang aktif di departemen {form.department}. Tambah magang dulu atau ganti departemen.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredInterns.map((i) => (
                    <label
                      key={i.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50/30 ${
                        form.assigned_intern_ids.includes(i.id) ? 'bg-bpjs-blue/10' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.assigned_intern_ids.includes(i.id)}
                        onChange={() => toggleIntern(i.id)}
                        className="w-4 h-4 accent-bpjs-blue"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{i.name}</div>
                        <div className="text-xs text-gray-500">{i.major} • @{i.username}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {form.mode === 'team' && form.assigned_intern_ids.length === 1 && (
                <p className="text-xs text-amber-600 mt-1">💡 Mode Tim sebaiknya pilih minimal 2 magang untuk kolaborasi.</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi Base Tugas *
              <span className="text-xs text-gray-500 font-normal ml-2">
                (AI akan menyesuaikan per jurusan magang)
              </span>
            </label>
            <textarea
              required
              rows={4}
              value={form.base_description}
              onChange={(e) => setForm({ ...form, base_description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
              placeholder="Lakukan verifikasi dokumen klaim JHT melalui aplikasi JMO. Pastikan dokumen lengkap dan data sesuai."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deadline (opsional)
            </label>
            <input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pb-1">
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
              {editing ? 'Simpan Perubahan' : 'Buat Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
