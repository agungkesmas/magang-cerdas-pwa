'use client';

import { useState, useEffect } from 'react';
import {
  BookHeart,
  Loader2,
  Save,
  CheckCircle2,
  Zap,
  Flame,
  Calendar,
  BookX,
  Info
} from 'lucide-react';

export default function InternLogbookPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recentExp, setRecentExp] = useState<number | null>(null);
  const [logbookEnabled, setLogbookEnabled] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    entry_date: today,
    activity: '',
    learning_summary: '',
    difficulties: ''
  });

  const fetchEntries = async () => {
    setLoading(true);
    try {
      // Fetch dashboard intern untuk dapat flag logbook_enabled
      const dashRes = await fetch('/api/dashboard/intern');
      const dashData = await dashRes.json();
      if (dashData.success && dashData.profile) {
        setLogbookEnabled(dashData.profile.logbook_enabled !== false);
      }

      const res = await fetch('/api/logbook/list');
      const data = await res.json();
      if (data.success) {
        setEntries(data.logbook || []);
        // Pre-fill today's entry if exists
        const todayEntry = (data.logbook || []).find((e: any) => e.entry_date === today);
        if (todayEntry) {
          setForm({
            entry_date: todayEntry.entry_date,
            activity: todayEntry.activity || '',
            learning_summary: todayEntry.learning_summary || '',
            difficulties: todayEntry.difficulties || ''
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/logbook/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          // Logbook dinonaktifkan
          setLogbookEnabled(false);
          setErrorMsg(data.error);
          return;
        }
        throw new Error(data.error);
      }
      if (data.exp_gained > 0) {
        setRecentExp(data.exp_gained);
        setTimeout(() => setRecentExp(null), 3000);
      }
      fetchEntries();
      alert(data.updated ? 'Logbook diperbarui!' : 'Logbook tersimpan!');
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" />
      </div>
    );
  }

  // Notice jika logbook dinonaktifkan admin
  if (!logbookEnabled) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Logbook Harian
          </h1>
          <p className="text-sm text-white/60 mt-1">Catat aktivitas & pembelajaran harian Anda</p>
        </div>

        <div className="glass-card p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500/20 rounded-2xl mb-4">
            <BookX className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Logbook Digital Dinonaktifkan</h3>
          <p className="text-sm text-white/60 max-w-md mx-auto mb-4">
            Admin telah menonaktifkan logbook digital untuk akun Anda. Kemungkinan Anda menggunakan
            buku logbook manual. Silakan catat aktivitas harian Anda di buku manual.
          </p>
          <div className="bg-white/5 rounded-lg p-4 max-w-md mx-auto text-left">
            <div className="flex items-start gap-2 text-sm text-white/70">
              <Info className="w-4 h-4 text-bpjs-yellow flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white/90 mb-1">Tips Pengisian Buku Manual:</p>
                <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                  <li>Tanggal aktivitas</li>
                  <li>Deskripsi kegiatan yang dilakukan</li>
                  <li>Ringkasan pembelajaran</li>
                  <li>Kesulitan yang dihadapi (jika ada)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="glass-card p-4">
            <h3 className="text-sm font-semibold text-white/80 mb-3">Riwayat Logbook (sebelum dinonaktifkan)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="border-l-2 border-bpjs-yellow/30 pl-3 py-1">
                  <div className="text-xs font-semibold text-bpjs-yellow">
                    {new Date(entry.entry_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                  <p className="text-sm text-white/90 line-clamp-2">{entry.activity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Logbook Harian
        </h1>
        <p className="text-sm text-white/60 mt-1">Catat aktivitas & pembelajaran harian Anda</p>
      </div>

      {recentExp && (
        <div className="glass-card p-3 bg-bpjs-yellow/10 border-bpjs-yellow/30 flex items-center gap-2">
          <Zap className="w-5 h-5 text-bpjs-yellow" />
          <span className="text-bpjs-yellow font-bold">+{recentExp} EXP</span>
          <span className="text-white/60 text-sm">— Logbook harian tersimpan!</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Tanggal</label>
          <input
            type="date"
            value={form.entry_date}
            onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
            required
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Aktivitas Hari Ini *</label>
          <textarea
            required
            rows={4}
            value={form.activity}
            onChange={(e) => setForm({ ...form, activity: e.target.value })}
            placeholder="Ceritakan aktivitas utama yang Anda lakukan hari ini..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Ringkasan Pembelajaran</label>
          <textarea
            rows={3}
            value={form.learning_summary}
            onChange={(e) => setForm({ ...form, learning_summary: e.target.value })}
            placeholder="Apa yang Anda pelajari hari ini?"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">Kesulitan / Tantangan</label>
          <textarea
            rows={2}
            value={form.difficulties}
            onChange={(e) => setForm({ ...form, difficulties: e.target.value })}
            placeholder="Adakah kendala yang dihadapi?"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold py-3 rounded-lg disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Menyimpan...' : 'Simpan Logbook'}
        </button>
      </form>

      {/* Streak indicator */}
      <div className="glass-card p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
          <Flame className="w-6 h-6 text-orange-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-400">{entries.length}</div>
          <div className="text-xs text-white/60">Total Hari Logbook Aktif</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-white/60">Streak saat ini</div>
          <div className="text-lg font-bold text-orange-400">
            🔥 {calculateStreak(entries)}
          </div>
        </div>
      </div>

      {/* History */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-bpjs-yellow" />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <BookHeart className="w-10 h-10 mx-auto text-white/30 mb-2" />
          <p className="text-white/60 text-sm">Belum ada catatan logbook.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-white/80">Riwayat Logbook</h3>
          {entries.slice(0, 10).map((entry) => (
            <div key={entry.id} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-bpjs-yellow" />
                <span className="text-xs font-semibold text-bpjs-yellow">
                  {new Date(entry.entry_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-white/90 line-clamp-2">{entry.activity}</p>
              {entry.learning_summary && (
                <p className="text-xs text-white/60 mt-1 italic line-clamp-1">💡 {entry.learning_summary}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function calculateStreak(entries: any[]): number {
  if (entries.length === 0) return 0;
  const dates = entries.map((e) => new Date(e.entry_date).toISOString().split('T')[0]).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dates[0] !== today && dates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}
