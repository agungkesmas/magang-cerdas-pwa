'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Award,
  Zap,
  Clock,
  TrendingUp,
  Loader2,
  AlertTriangle,
  GraduationCap,
  Flame,
  Calendar
} from 'lucide-react';

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

export default function BKKHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { teacher, stats, interns } = data;

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-br from-bpjs-green to-bpjs-green-dark rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-8 h-8 text-bpjs-yellow" />
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              Selamat Datang, {teacher.name.split(' ')[0]}!
            </h1>
            <p className="text-white/80 text-sm">
              {teacher.schools.length > 0
                ? `Membimbing ${teacher.schools.length} sekolah`
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
        <p className="text-white/80 text-sm mt-3">
          Pantau perkembangan siswa-siswi Anda selama magang di BPJS Ketenagakerjaan Cabang Cirebon.
        </p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Pemagang"
          value={stats.total_interns}
          color="bpjs-blue"
          sub={`${stats.active_interns} aktif`}
        />
        <StatCard
          icon={Zap}
          label="Rata-rata EXP"
          value={stats.avg_exp}
          color="bpjs-yellow"
          sub="dari semua siswa"
        />
        <StatCard
          icon={Award}
          label="Sertifikat Terbit"
          value={stats.certified_count}
          color="bpjs-green"
          sub="siswa sudah lulus"
        />
        <StatCard
          icon={Clock}
          label="Akan Selesai"
          value={stats.near_end_count}
          color="orange"
          sub="< 14 hari lagi"
        />
      </div>

      {/* Active interns list (preview) */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Pemagang Aktif
          </h2>
          <Link href="/bkk/interns" className="text-sm text-bpjs-green hover:underline font-medium">
            Lihat Semua →
          </Link>
        </div>

        {interns.filter((i) => i.is_active).length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Belum ada pemagang dari sekolah Anda.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {interns
              .filter((i) => i.is_active)
              .slice(0, 5)
              .map((intern) => (
                <Link
                  key={intern.id}
                  href={`/bkk/interns?id=${intern.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-bpjs-green/30 hover:bg-green-50/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-bpjs-green/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-bpjs-green font-bold">{intern.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">{intern.name}</p>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {intern.major}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-bpjs-yellow" />
                        {intern.total_exp} EXP
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {intern.streak_count} hari
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {intern.days_remaining} hari lagi
                      </span>
                    </div>
                  </div>
                  <div className="w-16 text-right">
                    <div className="text-xs text-gray-500">Progress</div>
                    <div className="text-sm font-bold text-bpjs-green">{intern.time_progress}%</div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Tentang Dashboard BKK</p>
          <p className="text-blue-700 mt-1">
            Anda hanya dapat melihat data siswa dari {teacher.schools.length} sekolah yang Anda bimbing
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
