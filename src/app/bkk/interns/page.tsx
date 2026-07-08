'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Loader2,
  Zap,
  Flame,
  Clock,
  Award,
  TrendingUp,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  CheckSquare,
  AlertTriangle,
  ExternalLink,
  Search,
  Upload,
  Bell
} from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';

export default function BKKInternsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-bpjs-green" /></div>}>
      <BKKInternsContent />
    </Suspense>
  );
}

function BKKInternsContent() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  if (selectedId) {
    return <InternDetail internId={selectedId} />;
  }
  return <InternList />;
}

function InternList() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'at_risk'>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [nudgeTarget, setNudgeTarget] = useState<string | null>(null);

  useEffect(() => {
    fetchFresh('/api/dashboard/bkk')
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  if (!data) return null;

  const filtered = data.interns.filter((i: any) => {
    if (schoolFilter !== 'all' && i.school_origin !== schoolFilter) return false;
    if (filter === 'active') return i.is_active;
    if (filter === 'completed') return i.certificate_unlocked;
    if (filter === 'at_risk') {
      const att = i.attendance;
      const dur = i.duration_days || 1;
      const attRate = att && att.check_in_count > 0 ? att.check_in_count / Math.max(1, dur) : 0;
      return i.is_active && (attRate < 0.5 || (i.total_exp || 0) < 100);
    }
    return true;
  }).filter((i: any) => {
    // Search by name
    if (!search) return true;
    return i.name.toLowerCase().includes(search.toLowerCase()) ||
           (i.major || '').toLowerCase().includes(search.toLowerCase()) ||
           (i.department || '').toLowerCase().includes(search.toLowerCase());
  });

  const handleNudge = async (internId: string, name: string) => {
    if (!confirm(`Kirim pengingat ke ${name}?`)) return;
    setNudgeTarget(internId);
    try {
      const res = await fetch('/api/nudge/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intern_id: internId,
          message: `Hai ${name}! Ini pengingat dari BKK sekolah Anda. Jangan lupa rajin check-in dan kerjakan tugas magang ya. Semangat!`,
          type: 'bkk_reminder'
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      alert(`Pengingat terkirim ke ${name}!`);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setNudgeTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Daftar Peserta Magang
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {data.interns.length} peserta dari {data.teacher.schools.length} institusi yang Anda bimbing
          </p>
        </div>
        <a
          href="/api/interns/template"
          className="inline-flex items-center gap-1.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-sm font-semibold px-3 py-2 rounded-lg shadow-sm"
        >
          <Upload className="w-4 h-4" /> Template Excel
        </a>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama, jurusan, departemen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
          />
        </div>
        {/* Filter sekolah */}
        {data.teacher.schools.length > 1 && (
          <select
            value={schoolFilter}
            onChange={(e) => setSchoolFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
          >
            <option value="all">Semua Institusi ({data.interns.length})</option>
            {data.teacher.schools.map((s: string) => {
              const count = data.interns.filter((i: any) => i.school_origin === s).length;
              return (
                <option key={s} value={s}>
                  {s} ({count})
                </option>
              );
            })}
          </select>
        )}
        {/* Filter status */}
        {(['all', 'active', 'completed', 'at_risk'] as const).map((f) => {
          const count = data.interns.filter((i: any) => {
            if (schoolFilter !== 'all' && i.school_origin !== schoolFilter) return false;
            if (f === 'active') return i.is_active;
            if (f === 'completed') return i.certificate_unlocked;
            return true;
          }).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filter === f ? 'bg-bpjs-green text-white' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              {f === 'all' ? `Semua (${count})` : f === 'active' ? `Aktif (${count})` : f === 'at_risk' ? `⚠️ At Risk (${count})` : `Selesai (${count})`}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada pemagang pada filter ini.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((intern: any) => {
            // At-risk check
            const att = intern.attendance;
            const dur = intern.duration_days || 1;
            const attRate = att && att.check_in_count > 0 ? att.check_in_count / Math.max(1, dur) : 0;
            const isAtRisk = intern.is_active && (attRate < 0.5 || (intern.total_exp || 0) < 100);

            return (
            <div
              key={intern.id}
              onClick={() => window.location.href = `/bkk/interns?id=${intern.id}`}
              className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all cursor-pointer ${
                isAtRisk ? 'border-red-200 bg-red-50/30' : 'border-gray-200 hover:border-bpjs-green/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Avatar + name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-bpjs-green font-bold text-lg">{intern.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{intern.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {intern.major}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-medium">
                        {intern.department}
                      </span>
                      {intern.certificate_unlocked && (
                        <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full font-medium flex items-center gap-1">
                          <Award className="w-3 h-3" /> Sertifikat
                        </span>
                      )}
                      {isAtRisk && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Butuh Perhatian
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-bpjs-yellow" />
                        {intern.total_exp} EXP
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {intern.streak_count} streak
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-bpjs-green" />
                        {intern.attendance.check_in_count} check-in
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-bpjs-blue" />
                        {intern.logbook_count || 0} aktivitas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time progress */}
                <div className="sm:w-40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Waktu magang</span>
                    <span className={`font-semibold ${
                      intern.time_progress >= 80 ? 'text-red-600' :
                      intern.time_progress >= 50 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>{intern.time_progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        intern.time_progress >= 80 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                        intern.time_progress >= 50 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                        'bg-gradient-to-r from-green-400 to-green-600'
                      }`}
                      style={{ width: `${intern.time_progress}%` }}
                    />
                  </div>
                  <div className={`text-xs mt-1 font-medium ${
                    intern.time_progress >= 80 ? 'text-red-600' :
                    intern.time_progress >= 50 ? 'text-amber-600' :
                    'text-green-600'
                  }`}>
                    {intern.is_active ? `${intern.days_remaining} hari lagi` : 'Selesai'}
                  </div>
                </div>

                {/* Nudge button */}
                {intern.is_active && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNudge(intern.id, intern.name);
                    }}
                    disabled={nudgeTarget === intern.id}
                    className="flex-shrink-0 p-2 bg-bpjs-green/10 hover:bg-bpjs-green/20 text-bpjs-green rounded-lg disabled:opacity-50"
                    title="Kirim pengingat ke peserta"
                  >
                    {nudgeTarget === intern.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InternDetail({ internId }: { internId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bkk/intern-detail?id=${internId}`)
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .finally(() => setLoading(false));
  }, [internId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  if (!data) return null;
  if (data.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
        {data.error}
      </div>
    );
  }

  const { intern, attendance_summary, activity_history, task_completions, certificate } = data;

  return (
    <div className="space-y-5">
      <a href="/bkk/interns" className="inline-flex items-center gap-1 text-gray-500 hover:text-bpjs-green text-sm">
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar
      </a>

      <Link
        href={`/bkk/interns/${internId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-bpjs-green/10 hover:bg-bpjs-green/20 text-bpjs-green text-sm font-semibold rounded-lg"
      >
        <Clock className="w-4 h-4" /> Lihat Timeline Lengkap (Audit Trail)
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
            <span className="text-bpjs-green font-bold text-2xl">{intern.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              {intern.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{intern.major}</span>
              <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full font-medium">
                {intern.department}
              </span>
              <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full font-bold">
                TIER: {intern.tier}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {intern.school_origin}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Periode: {new Date(intern.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} — {new Date(intern.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-bpjs-yellow" />
            <span className="text-xs text-gray-500">Total EXP</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{intern.total_exp}</div>
          <div className="text-xs text-gray-400 mt-0.5">Level {intern.level_info.level}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Streak</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{intern.streak_count}</div>
          <div className="text-xs text-gray-400 mt-0.5">hari beruntun</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-bpjs-green" />
            <span className="text-xs text-gray-500">Kehadiran</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{attendance_summary.total_check_ins}</div>
          <div className="text-xs text-gray-400 mt-0.5">total check-in</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`w-4 h-4 ${
              intern.time_progress >= 80 ? 'text-red-500' :
              intern.time_progress >= 50 ? 'text-amber-500' :
              'text-green-500'
            }`} />
            <span className="text-xs text-gray-500">Progress Waktu</span>
          </div>
          <div className={`text-2xl font-bold ${
            intern.time_progress >= 80 ? 'text-red-600' :
            intern.time_progress >= 50 ? 'text-amber-600' :
            'text-green-600'
          }`}>{intern.time_progress}%</div>
          <div className={`text-xs mt-0.5 font-medium ${
            intern.time_progress >= 80 ? 'text-red-600' :
            intern.time_progress >= 50 ? 'text-amber-600' :
            'text-green-600'
          }`}>{intern.days_remaining} hari tersisa</div>
        </div>
      </div>

      {/* Last 7 days attendance */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Kehadiran 7 Hari Terakhir
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {attendance_summary.last_7_days.slice().reverse().map((day: any, idx: number) => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('id-ID', { weekday: 'short' });
            const dayNum = date.getDate();
            return (
              <div
                key={idx}
                className={`rounded-lg p-2 text-center border ${
                  day.check_in && day.check_out
                    ? 'bg-bpjs-green/10 border-bpjs-green/30'
                    : day.check_in
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="text-[10px] text-gray-500">{dayName}</div>
                <div className="text-sm font-bold text-gray-900">{dayNum}</div>
                <div className="mt-1 flex items-center justify-center gap-0.5">
                  {day.check_in ? (
                    <CheckCircle2 className="w-3 h-3 text-bpjs-green" />
                  ) : (
                    <XCircle className="w-3 h-3 text-gray-300" />
                  )}
                  {day.check_out ? (
                    <CheckCircle2 className="w-3 h-3 text-bpjs-green" />
                  ) : (
                    <XCircle className="w-3 h-3 text-gray-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-bpjs-green" /> Check-in/out lengkap
          </span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-amber-500" /> Hanya check-in
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="w-3 h-3 text-gray-300" /> Tidak hadir
          </span>
        </div>
      </div>

      {/* Task completion summary */}
      {task_completions.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Progress Tugas
          </h2>
          <div className="space-y-3">
            {task_completions.map((t: any) => {
              const pct = t.target_count > 0 ? Math.min(100, (t.completed_count / t.target_count) * 100) : 0;
              return (
                <div key={t.task_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium truncate">{t.task_title}</span>
                    <span className="text-gray-500 ml-2 whitespace-nowrap">
                      {t.completed_count} / {t.target_count}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-bpjs-green" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity history */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Riwayat Aktivitas ({activity_history?.length || 0})
        </h2>
        {(!activity_history || activity_history.length === 0) ? (
          <div className="text-center py-6">
            <CheckSquare className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Belum ada aktivitas yang diselesaikan.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activity_history.map((act: any, i: number) => (
              <div key={i} className="border-l-2 border-bpjs-green/30 pl-3 py-1">
                <div className="text-xs font-semibold text-bpjs-green mb-1">
                  {new Date(act.completed_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  {act.is_quest && <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium">🎯 Quest</span>}
                  <span className="ml-2 text-bpjs-yellow font-bold">+{act.xp} XP</span>
                </div>
                <p className="text-sm text-gray-800 font-medium">{act.title}</p>
                {act.notes && (
                  <p className="text-xs text-gray-600 mt-1 italic">📝 {act.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate */}
      {certificate && (
        <div className="bg-gradient-to-br from-bpjs-yellow/20 to-amber-100/30 border border-bpjs-yellow/40 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-8 h-8 text-bpjs-blue-dark" />
            <div>
              <h2 className="font-bold text-bpjs-blue-dark" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Sertifikat Diterbitkan
              </h2>
              <p className="text-xs text-gray-700">Tier: {certificate.tier} • Diterbitkan: {new Date(certificate.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-gray-600">
              Verification ID: <span className="font-mono font-bold">{certificate.verification_id}</span>
            </p>
            <a
              href={`/api/certificate/verify?id=${certificate.verification_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs bg-bpjs-blue text-white px-3 py-1.5 rounded-lg font-medium hover:bg-bpjs-blue-dark"
            >
              <ExternalLink className="w-3 h-3" /> Verifikasi Sertifikat
            </a>
          </div>
        </div>
      )}

      {/* Privacy notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Catatan: Untuk privacy siswa, foto selfie check-in, koordinat GPS detail, dan instruksi AI tugas internal BPJS tidak ditampilkan di dashboard BKK.
        </p>
      </div>
    </div>
  );
}
