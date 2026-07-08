'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertCircle, CheckCircle2, XCircle, Clock, Loader2, FileEdit, X } from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';

interface CorrectionRecord {
  id: string;
  correction_date: string;
  type: string;
  reason: string;
  promise_not_repeat: boolean;
  status: string;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface DayRecord {
  date: string;
  check_in: any | null;
  check_out: any | null;
  correction_pending: CorrectionRecord | null;
}

export default function AttendanceRecap() {
  const [days, setDays] = useState<DayRecord[]>([]);
  const [corrections, setCorrections] = useState<CorrectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    correction_date: '',
    type: 'Check-In' as 'Check-In' | 'Check-Out',
    reason: '',
    promise_not_repeat: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [attRes, corrRes] = await Promise.all([
        fetchFresh('/api/attendance/list?limit=200'),
        fetchFresh('/api/attendance/correction/list')
      ]);
      const attData = await attRes.json();
      const corrData = await corrRes.json();

      // Build 30-day history
      const today = new Date();
      const dayList: DayRecord[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        const atts = (attData.attendance || []).filter((a: any) => {
          const attDate = new Date(a.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
          return attDate === dateStr;
        });
        const ci = atts.find((a: any) => a.type === 'Check-In') || null;
        const co = atts.find((a: any) => a.type === 'Check-Out') || null;
        const corr = (corrData.corrections || []).find((c: any) => c.correction_date === dateStr && (!ci || c.type === 'Check-Out' ? !co : false));
        dayList.push({ date: dateStr, check_in: ci, check_out: co, correction_pending: corr || null });
      }
      setDays(dayList);
      setCorrections(corrData.corrections || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/attendance/correction/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(data.message);
      setShowForm(false);
      setFormData({ correction_date: '', type: 'Check-In', reason: '', promise_not_repeat: false });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getDayStatus = (day: DayRecord) => {
    const hasCI = !!day.check_in;
    const hasCO = !!day.check_out;
    const isCI = day.check_in?.is_late;
    const isEarly = day.check_out?.is_early;
    const isCorrection = day.check_in?.notes?.includes('Koreksi') || day.check_out?.notes?.includes('Koreksi');
    const pending = day.correction_pending;

    if (hasCI && hasCO) {
      let badge = '✅';
      let label = 'Lengkap';
      if (isCI) { badge = '⚠️'; label = 'Telat Masuk'; }
      if (isEarly) { badge = '🏠'; label = 'Pulang Awal'; }
      if (isCI && isEarly) { badge = '⚠️'; label = 'Telat & Pulang Awal'; }
      if (isCorrection) { badge = '📝'; label = 'Koreksi Disetujui'; }
      return { badge, label, color: 'text-bpjs-green' };
    }
    if (hasCI && !hasCO) {
      if (pending && pending.type === 'Check-Out') {
        return { badge: '⏳', label: 'Koreksi CO Pending', color: 'text-amber-400' };
      }
      return { badge: '📍', label: 'Sudah Masuk, Belum Pulang', color: 'text-blue-400' };
    }
    if (!hasCI && hasCO) {
      if (pending && pending.type === 'Check-In') {
        return { badge: '⏳', label: 'Koreksi CI Pending', color: 'text-amber-400' };
      }
      return { badge: '🏠', label: 'Pulang tanpa Masuk', color: 'text-orange-400' };
    }
    // No absen at all
    if (pending) {
      return { badge: '⏳', label: 'Koreksi Pending', color: 'text-amber-400' };
    }
    return { badge: '❌', label: 'Tidak Absen', color: 'text-red-400' };
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00+07:00');
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const isWeekend = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00+07:00');
    const day = d.toLocaleDateString('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' });
    return day === 'Sun' || day === 'Sat';
  };

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-bpjs-yellow" />
          <h3 className="text-sm font-semibold text-white">Rekap Absen 30 Hari</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 bg-bpjs-yellow/20 hover:bg-bpjs-yellow/30 border border-bpjs-yellow/40 text-bpjs-yellow text-xs font-medium px-2.5 py-1 rounded-lg"
        >
          <FileEdit className="w-3 h-3" /> Ajukan Koreksi
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-3 text-[10px] text-white/50">
        <span>✅ Lengkap</span>
        <span>⚠️ Telat Masuk</span>
        <span>🏠 Pulang Awal</span>
        <span>📝 Koreksi</span>
        <span>⏳ Koreksi Pending</span>
        <span>❌ Tidak Absen</span>
      </div>

      {/* Form Koreksi */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-3 p-3 bg-white/5 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Form Koreksi Absen</h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-white/50 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</p>}
          {success && <p className="text-xs text-bpjs-green bg-bpjs-green/10 p-2 rounded">{success}</p>}

          <div>
            <label className="block text-xs text-white/70 mb-1">Tanggal yang Kelupaan *</label>
            <input
              type="date"
              required
              value={formData.correction_date}
              onChange={(e) => setFormData({ ...formData, correction_date: e.target.value })}
              max={new Date(Date.now() - 86400000).toLocaleDateString('en-CA')}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
            <p className="text-[10px] text-white/40 mt-0.5">Hanya untuk tanggal kemarin atau sebelumnya</p>
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Tipe Absen yang Kelupaan *</label>
            <div className="flex gap-2">
              {(['Check-In', 'Check-Out'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                    formData.type === t
                      ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                      : 'bg-white/5 text-white/70 border border-white/10'
                  }`}
                >
                  {t === 'Check-In' ? '📍 Absen Masuk' : '🏠 Absen Pulang'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/70 mb-1">Alasan Kelupaan Absen * (min. 10 karakter)</label>
            <textarea
              required
              minLength={10}
              maxLength={300}
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Mis. Saya lupa check-out karena harus buru-buru pulang untuk urusan keluarga mendesak..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white h-20 resize-none"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={formData.promise_not_repeat}
              onChange={(e) => setFormData({ ...formData, promise_not_repeat: e.target.checked })}
              className="mt-0.5"
            />
            <span className="text-xs text-white/70">
              Saya berjanji tidak akan mengulangi kelupaan absen dan akan lebih disiplin ke depannya.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-bpjs-yellow text-bpjs-blue-dark font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Kirim Pengajuan Koreksi'}
          </button>
          <p className="text-[10px] text-white/40 text-center">Maksimal 5 koreksi per bulan. Admin akan review dan approve/reject.</p>
        </form>
      )}

      {/* 30-day list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-bpjs-yellow" />
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {days.map((day) => {
            const status = getDayStatus(day);
            const weekend = isWeekend(day.date);
            return (
              <div
                key={day.date}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  weekend ? 'bg-white/5 opacity-60' : 'bg-white/5'
                }`}
              >
                <div className="w-12 text-center flex-shrink-0">
                  <div className="text-[10px] text-white/50">{formatDate(day.date).split(' ')[0]}</div>
                  <div className="text-sm font-bold text-white">{formatDate(day.date).split(' ')[1]}</div>
                </div>
                <div className="text-lg flex-shrink-0">{status.badge}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-medium ${status.color}`}>{status.label}</div>
                  <div className="text-[10px] text-white/50 flex gap-2">
                    {day.check_in && <span>📍 {formatTime(day.check_in.timestamp)}{day.check_in.is_late ? ' ⚠️' : ''}</span>}
                    {day.check_out && <span>🏠 {formatTime(day.check_out.timestamp)}{day.check_out.is_early ? ' 🏠' : ''}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History koreksi */}
      {corrections.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <h4 className="text-xs font-semibold text-white/70 mb-2">Riwayat Koreksi ({corrections.length})</h4>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {corrections.slice(0, 10).map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs p-1.5 rounded bg-white/5">
                <span className="flex-shrink-0">
                  {c.status === 'pending' ? '⏳' : c.status === 'approved' ? '✅' : '❌'}
                </span>
                <span className="text-white/70 flex-shrink-0">{c.type}</span>
                <span className="text-white/50 flex-shrink-0">{c.correction_date}</span>
                <span className={`flex-shrink-0 ${
                  c.status === 'pending' ? 'text-amber-400' :
                  c.status === 'approved' ? 'text-bpjs-green' : 'text-red-400'
                }`}>
                  {c.status}
                </span>
                {c.review_notes && (
                  <span className="text-white/40 truncate flex-1">{c.review_notes}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
