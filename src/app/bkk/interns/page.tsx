'use client';

import { useState, useEffect, Suspense } from 'react';
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
  BookHeart,
  AlertTriangle
} from 'lucide-react';

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
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetch('/api/dashboard/bkk')
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
    if (filter === 'active') return i.is_active;
    if (filter === 'completed') return i.certificate_unlocked;
    return true;
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Daftar Pemagang
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {data.interns.length} siswa dari {data.teacher.schools.length} sekolah yang Anda bimbing
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'active', 'completed'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === f ? 'bg-bpjs-green text-white' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            {f === 'all' ? `Semua (${data.interns.length})` : f === 'active' ? `Aktif (${data.interns.filter((i: any) => i.is_active).length})` : `Selesai (${data.interns.filter((i: any) => i.certificate_unlocked).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada pemagang pada filter ini.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((intern: any) => (
            <a
              key={intern.id}
              href={`/bkk/interns?id=${intern.id}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bpjs-green/30 transition-all cursor-pointer"
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
                        <BookHeart className="w-3 h-3 text-bpjs-blue" />
                        {intern.logbook_count} logbook
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time progress */}
                <div className="sm:w-40">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Waktu magang</span>
                    <span className="font-semibold text-gray-700">{intern.time_progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-bpjs-green to-bpjs-green-dark"
                      style={{ width: `${intern.time_progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {intern.is_active ? `${intern.days_remaining} hari lagi` : 'Selesai'}
                  </div>
                </div>
              </div>
            </a>
          ))}
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

  const { intern, attendance_summary, logbook_entries, task_completions, certificate } = data;

  return (
    <div className="space-y-5">
      <a href="/bkk/interns" className="inline-flex items-center gap-1 text-gray-500 hover:text-bpjs-green text-sm">
        <ChevronLeft className="w-4 h-4" /> Kembali ke daftar
      </a>

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
            <Clock className="w-4 h-4 text-bpjs-blue" />
            <span className="text-xs text-gray-500">Progress Waktu</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{intern.time_progress}%</div>
          <div className="text-xs text-gray-400 mt-0.5">{intern.days_remaining} hari tersisa</div>
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

      {/* Logbook review */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Catatan Logbook ({logbook_entries.length})
        </h2>
        {logbook_entries.length === 0 ? (
          <div className="text-center py-6">
            <BookHeart className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Belum ada catatan logbook.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {logbook_entries.map((log: any) => (
              <div key={log.id} className="border-l-2 border-bpjs-green/30 pl-3 py-1">
                <div className="text-xs font-semibold text-bpjs-green mb-1">
                  {new Date(log.entry_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <p className="text-sm text-gray-800 font-medium">{log.activity}</p>
                {log.learning_summary && (
                  <p className="text-xs text-gray-600 mt-1 italic">💡 {log.learning_summary}</p>
                )}
                {log.difficulties && (
                  <p className="text-xs text-orange-700 mt-1">⚠️ {log.difficulties}</p>
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
          <p className="text-xs text-gray-600">
            Verification ID: <span className="font-mono font-bold">{certificate.verification_id}</span>
          </p>
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
