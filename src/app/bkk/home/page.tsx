'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import {
  Users,
  Award,
  Zap,
  Clock,
  Loader2,
  AlertTriangle,
  GraduationCap,
  Flame,
  Calendar,
  Send,
  Inbox,
  CheckCircle2,
  Plus,
  ChevronRight,
  BookHeart,
  TrendingUp,
  PartyPopper
} from 'lucide-react';
import { calculateTier } from '@/lib/utils';

interface DashboardData {
  teacher: { name: string; email: string; schools: string[] };
  stats: {
    total_interns: number;
    active_interns: number;
    avg_exp: number;
    certified_count: number;
    near_end_count: number;
  };
  interns: any[];
  warning?: string;
}

interface RequestStats {
  submitted: number;
  under_review: number;
  accepted: number;
  completed: number;
}

export default function BKKHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [reqStats, setReqStats] = useState<RequestStats>({ submitted: 0, under_review: 0, accepted: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/bkk').then((r) => r.json()).catch(() => null),
      fetch('/api/bkk/requests').then((r) => r.json()).catch(() => null)
    ]).then(([dash, reqs]) => {
      if (dash?.success) setData(dash);
      if (reqs?.success) {
        const list = reqs.requests || [];
        setReqStats({
          submitted: list.filter((r: any) => r.status === 'submitted').length,
          under_review: list.filter((r: any) => r.status === 'under_review').length,
          accepted: list.filter((r: any) => r.status === 'accepted').length,
          completed: list.filter((r: any) => r.status === 'completed').length
        });
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  if (!data) return null;

  const { teacher, stats, interns } = data;
  const hasActiveRequests = reqStats.submitted + reqStats.under_review + reqStats.accepted > 0;
  const topInterns = [...interns].filter((i) => i.is_active).sort((a, b) => (b.total_exp || 0) - (a.total_exp || 0)).slice(0, 10);
  const endingSoon = interns.filter((i) => i.is_active && i.days_remaining <= 14).sort((a, b) => a.days_remaining - b.days_remaining).slice(0, 4);
  const certifiedInterns = interns.filter((i) => i.certificate_unlocked).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-br from-bpjs-green to-bpjs-green-dark rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-bpjs-yellow/10 rounded-full" />
        <div className="absolute -right-4 top-12 w-24 h-24 bg-bpjs-yellow/10 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-9 h-9 text-bpjs-yellow" />
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Selamat Datang, {teacher.name.split(' ')[0]}!
              </h1>
              <p className="text-white/80 text-sm">
                {teacher.schools.length > 0
                  ? `Membimbing ${teacher.schools.length} sekolah • ${stats.active_interns} peserta aktif`
                  : 'Belum ada sekolah yang dibimbing'}
              </p>
            </div>
          </div>
          {teacher.schools.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {teacher.schools.map((school) => (
                <span
                  key={school}
                  className="text-xs px-2 py-1 bg-white/15 text-white rounded-full font-medium"
                >
                  🏫 {school}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Warning if no schools */}
      {data.warning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Belum Ada Sekolah</p>
            <p className="text-sm text-amber-700 mt-1">{data.warning}</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction
          href="/bkk/requests"
          icon={Plus}
          label="Ajukan Magang"
          desc="Kirim permintaan baru"
          color="bg-bpjs-green text-white"
        />
        <QuickAction
          href="/bkk/interns"
          icon={Users}
          label="Lihat Peserta"
          desc={`${stats.total_interns} peserta terdaftar`}
          color="bg-bpjs-blue text-white"
        />
        <QuickAction
          href="/bkk/certificates"
          icon={Award}
          label="Arsip Sertifikat"
          desc={`${stats.certified_count} terbit`}
          color="bg-bpjs-yellow text-bpjs-blue-dark"
        />
      </div>

      {/* Permintaan Magang summary card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Send className="w-5 h-5 text-bpjs-green" /> Permintaan Magang ke BPJTK
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Status pengajuan terbaru Anda</p>
          </div>
          <Link href="/bkk/requests" className="text-sm text-bpjs-green hover:underline font-medium flex items-center gap-1">
            Lihat Semua <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ReqStatChip icon={Send} label="Terkirim" value={reqStats.submitted} color="bg-blue-50 text-blue-700" />
          <ReqStatChip icon={Inbox} label="Sedang Direview" value={reqStats.under_review} color="bg-amber-50 text-amber-800" />
          <ReqStatChip icon={CheckCircle2} label="Diterima" value={reqStats.accepted} color="bg-green-50 text-green-800" />
          <ReqStatChip icon={PartyPopper} label="Selesai" value={reqStats.completed} color="bg-bpjs-green/10 text-bpjs-green-dark" />
        </div>
        {!hasActiveRequests && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
            <p className="text-sm text-green-800">Belum ada permintaan aktif. Mulai ajukan penempatan peserta magang!</p>
            <Link href="/bkk/requests" className="inline-flex items-center gap-1 bg-bpjs-green text-white text-xs font-semibold px-3 py-1.5 rounded-md">
              <Plus className="w-3 h-3" /> Ajukan
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Peserta"
          value={stats.total_interns}
          color="bpjs-blue"
          sub={`${stats.active_interns} aktif`}
        />
        <StatCard
          icon={Zap}
          label="Rata-rata EXP"
          value={stats.avg_exp}
          color="bpjs-yellow"
          sub="dari semua peserta"
        />
        <StatCard
          icon={Award}
          label="Sertifikat Terbit"
          value={stats.certified_count}
          color="bpjs-green"
          sub="peserta sudah lulus"
        />
        <StatCard
          icon={Clock}
          label="Akan Selesai"
          value={stats.near_end_count}
          color="orange"
          sub="< 14 hari lagi"
        />
      </div>

      {/* Share prestasi sekolah */}
      <div className="flex justify-end">
        <ShareButton
          data={{
            name: data?.teacher?.schools?.[0] || 'Sekolah Kami',
            major: 'BKK',
            department: 'BPJS Ketenagakerjaan',
            totalExp: stats.avg_exp || 0,
            level: 1,
            tier: '',
            timeProgress: 0,
            daysRemaining: 0,
            streak: 0,
            type: 'bkk-home',
            totalInterns: stats.total_interns,
            certifiedCount: stats.certified_count,
            avgExp: stats.avg_exp
          }}
          label="Bagikan Prestasi Sekolah"
          variant="default"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top performers (EXP leaderboard) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <TrendingUp className="w-5 h-5 text-bpjs-yellow" /> Papan Peringkat EXP
            </h2>
            <Link href="/bkk/interns" className="text-sm text-bpjs-green hover:underline font-medium">
              Semua →
            </Link>
          </div>
          {topInterns.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Belum ada pemagang aktif.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1 leaderboard-scroll">
              {topInterns.map((intern, idx) => (
                <Link
                  key={intern.id}
                  href={`/bkk/interns?id=${intern.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-green-50/40 transition-colors"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    idx === 0 ? 'bg-bpjs-yellow text-bpjs-blue-dark' :
                    idx === 1 ? 'bg-gray-200 text-gray-700' :
                    idx === 2 ? 'bg-amber-200 text-amber-900' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-bpjs-green font-bold text-sm">{intern.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{intern.name}</p>
                    <p className="text-xs text-gray-500">{intern.major}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-bpjs-yellow flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {intern.total_exp}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                      <Flame className="w-2.5 h-2.5 text-orange-500" /> {intern.streak_count} hari
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Ending soon */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Clock className="w-5 h-5 text-orange-500" /> Akan Selesai Soon
            </h2>
            <Link href="/bkk/interns" className="text-sm text-bpjs-green hover:underline font-medium">
              Semua →
            </Link>
          </div>
          {endingSoon.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm">Tidak ada peserta yang akan selesai dalam 14 hari.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {endingSoon.map((intern) => (
                <Link
                  key={intern.id}
                  href={`/bkk/interns?id=${intern.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-orange-50/40 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-700 font-bold text-sm">{intern.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{intern.name}</p>
                    <p className="text-xs text-gray-500">{intern.department}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${intern.days_remaining <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                      {intern.days_remaining} hari
                    </div>
                    <div className="text-[10px] text-gray-400">{intern.time_progress}% selesai</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently certified */}
      {certifiedInterns.length > 0 && (
        <div className="bg-gradient-to-br from-bpjs-yellow/10 to-amber-50 rounded-2xl border border-bpjs-yellow/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-bpjs-blue-dark flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Award className="w-5 h-5 text-bpjs-yellow" /> Sertifikat Baru Saja Terbit
            </h2>
            <Link href="/bkk/certificates" className="text-sm text-bpjs-blue-dark hover:underline font-medium">
              Arsip Lengkap →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {certifiedInterns.map((intern) => {
              const tier = calculateTier(intern.total_exp || 0, intern.start_date, intern.end_date);
              return (
                <Link
                  key={intern.id}
                  href={`/bkk/interns?id=${intern.id}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-lg border border-bpjs-yellow/20 hover:shadow-md transition-all"
                >
                  <Award className={`w-8 h-8 ${
                    tier === 'Excellence' ? 'text-bpjs-yellow' :
                    tier === 'Competent' ? 'text-bpjs-green' :
                    'text-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{intern.name}</p>
                    <p className="text-xs text-gray-500">{intern.school_origin}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tier === 'Excellence' ? 'bg-bpjs-yellow/30 text-bpjs-blue-dark' :
                    tier === 'Competent' ? 'bg-bpjs-green/20 text-bpjs-green-dark' :
                    'bg-gray-100 text-gray-600'
                  }`}>{tier}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Info notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Tentang Dashboard BKK</p>
          <p className="text-blue-700 mt-1">
            Anda hanya dapat melihat data peserta dari {teacher.schools.length} sekolah yang Anda bimbing
            {teacher.schools.length > 0 && (
              <>
                : <strong>{teacher.schools.join(', ')}</strong>
              </>
            )}
            . Data yang ditampilkan difilter untuk privacy: foto selfie, koordinat GPS, dan detail tugas internal BPJS tidak ditampilkan.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// QuickAction
// ============================================================
function QuickAction({ href, icon: Icon, label, desc, color }: { href: string; icon: any; label: string; desc: string; color: string }) {
  return (
    <Link
      href={href}
      className={`${color} rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] flex flex-col gap-2`}
    >
      <Icon className="w-6 h-6" />
      <div>
        <p className="font-bold text-sm leading-tight">{label}</p>
        <p className="text-xs opacity-90 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

// ============================================================
// ReqStatChip
// ============================================================
function ReqStatChip({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

// ============================================================
// StatCard
// ============================================================
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub
}: {
  icon: any;
  label: string;
  value: number | string;
  color: 'bpjs-blue' | 'bpjs-yellow' | 'bpjs-green' | 'orange';
  sub: string;
}) {
  const colorMap = {
    'bpjs-blue': 'bg-bpjs-blue/10 text-bpjs-blue',
    'bpjs-yellow': 'bg-bpjs-yellow/20 text-amber-700',
    'bpjs-green': 'bg-bpjs-green/10 text-bpjs-green',
    orange: 'bg-orange-100 text-orange-700'
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
