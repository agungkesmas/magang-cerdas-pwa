'use client';

import { useState, useEffect } from 'react';
import {
  CheckSquare,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  Sparkles,
  Plus,
  X,
  Send,
  FileText,
  History
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  is_completed: boolean;
  my_completion: string | null;
  is_overdue: boolean;
  created_by_intern: boolean;
  created_at: string;
}

interface HistoryItem {
  id: string;
  title: string;
  description: string;
  completion_notes: string | null;
  completed_at: string;
  source: string;
}

export default function InternActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [recentExp, setRecentExp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [actRes, histRes] = await Promise.all([
        fetch('/api/activities/list'),
        fetch('/api/activities/history')
      ]);
      const actData = await actRes.json();
      const histData = await histRes.json();
      if (actData.success) setActivities(actData.activities || []);
      if (histData.success) setHistory(histData.history || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: id, completion_notes: completionNotes.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setRecentExp(data.exp_gained);
        setTimeout(() => setRecentExp(null), 3000);
        setShowCompleteModal(null);
        setCompletionNotes('');
        fetchAll();
      } else {
        setErrorMsg(data.error);
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" /></div>;
  }

  const pending = activities.filter((a) => !a.is_completed && !a.is_overdue);
  const completed = activities.filter((a) => a.is_completed);
  const overdue = activities.filter((a) => !a.is_completed && a.is_overdue);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Aktivitas Hari Ini
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {pending.length} aktif • {completed.length} selesai
          </p>
        </div>
        {recentExp && (
          <div className="inline-flex items-center gap-1 bg-bpjs-yellow text-bpjs-blue-dark px-3 py-1.5 rounded-full font-bold text-sm animate-bounce-small">
            <Zap className="w-4 h-4" /> +{recentExp} EXP
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="glass-card p-3 bg-red-500/10 border-red-400/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Tab: Active vs History */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'active' ? 'bg-bpjs-yellow text-bpjs-blue-dark' : 'bg-white/5 text-white/60'}`}
        >
          <CheckSquare className="w-4 h-4 inline mr-1" /> Aktif ({pending.length + completed.length + overdue.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'history' ? 'bg-bpjs-yellow text-bpjs-blue-dark' : 'bg-white/5 text-white/60'}`}
        >
          <History className="w-4 h-4 inline mr-1" /> Riwayat ({history.length})
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="ml-auto px-3 py-2 bg-bpjs-yellow/10 hover:bg-bpjs-yellow/20 border border-bpjs-yellow/30 text-bpjs-yellow text-sm font-medium rounded-lg flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {/* Active tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <CheckSquare className="w-12 h-12 mx-auto text-white/30 mb-3" />
              <p className="text-white/60">Belum ada aktivitas yang ditugaskan.</p>
              <p className="text-white/40 text-xs mt-1">Klik "Tambah" untuk catat aktivitas tambahan yang kamu kerjakan.</p>
            </div>
          ) : (
            <>
              {/* Pending */}
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-bpjs-yellow" /> Aktif ({pending.length})
                  </h2>
                  {pending.map((act) => (
                    <div key={act.id} className="glass-card p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white">{act.title}</h3>
                            {act.created_by_intern && (
                              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">Dibuat sendiri</span>
                            )}
                            {act.due_date && (
                              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(act.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed mt-1 whitespace-pre-line">{act.description}</p>
                        </div>
                      </div>
                      {showCompleteModal === act.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            placeholder="Catatan hasil (opsional): contoh 'Selesai 50 dokumen', 'Dikerjakan 80%', 'Ada 3 dokumen kurang lengkap'..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowCompleteModal(null); setCompletionNotes(''); }}
                              className="flex-1 px-3 py-2 border border-white/10 text-white/60 text-sm rounded-lg"
                            >Batal</button>
                            <button
                              onClick={() => handleComplete(act.id)}
                              disabled={completing === act.id}
                              className="flex-1 px-3 py-2 bg-bpjs-yellow text-bpjs-blue-dark font-bold text-sm rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {completing === act.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              Selesai (+20 EXP)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowCompleteModal(act.id); setCompletionNotes(''); }}
                          className="w-full mt-2 flex items-center justify-center gap-2 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold py-2.5 rounded-lg transition-colors text-sm"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Tandai Selesai
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-bpjs-green flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Selesai ({completed.length})
                  </h2>
                  {completed.map((act) => (
                    <div key={act.id} className="glass-card p-3 opacity-70">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-bpjs-green flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="font-bold text-white text-sm line-through opacity-60">{act.title}</h3>
                          {act.my_completion && (
                            <p className="text-xs text-white/50 mt-0.5">📝 {new Date(act.my_completion).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="glass-card p-3 bg-blue-500/10 border-blue-400/30 text-xs text-blue-200">
            💡 Riwayat aktivitas bisa dipakai sebagai acuan untuk mengisi logbook manual di akhir minggu.
          </div>
          {history.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <History className="w-12 h-12 mx-auto text-white/30 mb-3" />
              <p className="text-white/60">Belum ada riwayat aktivitas yang diselesaikan.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id + item.completed_at} className="glass-card p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-bpjs-green flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        item.source === 'self' ? 'bg-purple-500/20 text-purple-300' :
                        item.source === 'department' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {item.source === 'self' ? 'Dibuat sendiri' : item.source === 'department' ? 'Departemen' : 'Ditugaskan'}
                      </span>
                    </div>
                    {item.completion_notes && (
                      <p className="text-xs text-white/60 mt-1">📝 {item.completion_notes}</p>
                    )}
                    <p className="text-xs text-white/40 mt-0.5">
                      {new Date(item.completed_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add activity modal (intern creates own) */}
      {showAddForm && (
        <InternAddActivityModal
          onClose={() => setShowAddForm(false)}
          onSuccess={() => { setShowAddForm(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function InternAddActivityModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/activities/intern-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
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
      <div className="bg-agent-card rounded-2xl max-w-md w-full shadow-2xl border border-agent-border">
        <div className="flex items-center justify-between p-5 border-b border-agent-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-bpjs-yellow" /> Tambah Aktivitas
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Judul *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
              placeholder="Bantu rekan urus arsip"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
              placeholder="Catat apa yang kamu kerjakan hari ini..."
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-white/10 text-white/70 text-sm rounded-lg">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-bpjs-yellow text-bpjs-blue-dark font-bold text-sm rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
