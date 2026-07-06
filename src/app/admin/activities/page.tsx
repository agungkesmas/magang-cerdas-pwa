'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Loader2,
  Search,
  Users,
  Archive,
  Award,
  ChevronRight,
  Clock,
  Calendar,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { calculateTier } from '@/lib/utils';

interface Intern {
  id: string;
  name: string;
  username?: string;
  school_origin: string;
  major: string;
  department: string;
  start_date: string;
  end_date: string;
  total_exp: number;
  streak_count: number;
  is_active: boolean;
  certificate_unlocked: boolean;
  certificate_id?: string | null;
  photo_url?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  tags?: string[] | null;
  days_remaining: number | null;
  time_progress: number;
}

function tierForExp(exp: number, startDate?: string | null, endDate?: string | null): { tier: string; color: string; bg: string } {
  const tier = calculateTier(exp, startDate, endDate);
  if (tier === 'Excellence') return { tier: 'Excellence', color: 'text-amber-700', bg: 'bg-amber-100' };
  if (tier === 'Competent') return { tier: 'Competent', color: 'text-blue-700', bg: 'bg-blue-100' };
  return { tier: 'Participation', color: 'text-gray-700', bg: 'bg-gray-100' };
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

export default function AdminActivitiesPage() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [certFilter, setCertFilter] = useState<'all' | 'certified' | 'uncertified'>('all');

  useEffect(() => {
    fetch('/api/interns/list')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInterns(d.interns || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const departments = useMemo(() => {
    const set = new Set<string>();
    interns.forEach((i) => i.department && set.add(i.department));
    return Array.from(set).sort();
  }, [interns]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return interns.filter((i) => {
      const matchSearch = !s
        || i.name.toLowerCase().includes(s)
        || i.school_origin?.toLowerCase().includes(s)
        || i.major?.toLowerCase().includes(s)
        || i.username?.toLowerCase().includes(s);
      const matchTab = tab === 'active' ? i.is_active : !i.is_active;
      const matchDept = deptFilter === 'all' || i.department === deptFilter;
      const matchCert = certFilter === 'all'
        || (certFilter === 'certified' && i.certificate_unlocked)
        || (certFilter === 'uncertified' && !i.certificate_unlocked);
      return matchSearch && matchTab && matchDept && matchCert;
    });
  }, [interns, search, tab, deptFilter, certFilter]);

  const stats = useMemo(() => {
    const activeCount = interns.filter((i) => i.is_active).length;
    const archivedCount = interns.filter((i) => !i.is_active).length;
    const certifiedCount = interns.filter((i) => i.certificate_unlocked).length;
    const totalExp = interns.reduce((sum, i) => sum + (i.total_exp || 0), 0);
    return { activeCount, archivedCount, certifiedCount, totalExp };
  }, [interns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-gray-900"
          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
        >
          Riwayat Aktivitas Peserta
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Audit trail lengkap per peserta — absensi, tugas, quest, izin, sertifikat. Berguna untuk verifikasi keaslian sertifikat.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Users className="w-3.5 h-3.5" /> Peserta Aktif
          </div>
          <div className="text-2xl font-bold text-bpjs-blue">{stats.activeCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Archive className="w-3.5 h-3.5" /> Arsip
          </div>
          <div className="text-2xl font-bold text-gray-600">{stats.archivedCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <Award className="w-3.5 h-3.5" /> Bersertifikat
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.certifiedCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Total EXP
          </div>
          <div className="text-2xl font-bold text-bpjs-green">{stats.totalExp.toLocaleString('id-ID')}</div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-bpjs-blue/5 border border-bpjs-blue/20 rounded-xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-bpjs-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-bpjs-blue mb-1">Untuk verifikasi sertifikat (anti-pemalsuan):</p>
          <p className="text-gray-600">
            Klik nama peserta untuk melihat timeline lengkap (absensi, tugas, quest, izin, sertifikat).
            Riwayat tetap tersimpan permanen walaupun peserta sudah diarsipkan — siap diakses sewaktu-waktu jika ada pertanyaan tentang keaslian magang/sertifikat.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, sekolah, jurusan, username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
            />
          </div>
          {/* Department filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40 text-sm"
          >
            <option value="all">Semua Departemen</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {/* Cert filter */}
          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value as 'all' | 'certified' | 'uncertified')}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40 text-sm"
          >
            <option value="all">Semua Sertifikat</option>
            <option value="certified">Sudah Bersertifikat</option>
            <option value="uncertified">Belum Bersertifikat</option>
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'active'
                ? 'bg-bpjs-blue text-white shadow-sm'
                : 'text-gray-600 bg-white border border-gray-200'
            }`}
          >
            Aktif ({stats.activeCount})
          </button>
          <button
            onClick={() => setTab('archived')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === 'archived'
                ? 'bg-gray-600 text-white shadow-sm'
                : 'text-gray-600 bg-white border border-gray-200'
            }`}
          >
            Arsip ({stats.archivedCount})
          </button>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada peserta yang cocok dengan filter.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((i) => {
            const tier = tierForExp(i.total_exp || 0, i.start_date, i.end_date);
            return (
              <Link
                key={i.id}
                href={`/admin/activities/${i.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bpjs-blue/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar / Photo */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bpjs-blue/15 to-bpjs-blue/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {i.photo_url ? (
                      <img
                        src={i.photo_url}
                        alt={i.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-bpjs-blue">
                        {(i.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-900 truncate">{i.name}</h3>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tier.bg} ${tier.color} font-medium`}>
                        {tier.tier}
                      </span>
                      {i.department && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full">
                          {i.department}
                        </span>
                      )}
                      {i.certificate_unlocked && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" /> Sertifikat
                        </span>
                      )}
                      {!i.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          Arsip
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="truncate">{i.school_origin}</span>
                      <span>•</span>
                      <span>{i.major}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {formatDate(i.start_date)} → {formatDate(i.end_date)}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-bpjs-green">
                        <ShieldCheck className="w-3 h-3" /> {(i.total_exp || 0).toLocaleString('id-ID')} EXP
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Streak {i.streak_count || 0} hari
                      </span>
                      {!i.is_active ? (
                        <span className="text-gray-400">Magang selesai</span>
                      ) : i.days_remaining !== null && i.days_remaining !== undefined ? (
                        <span className="text-gray-400">{i.days_remaining} hari lagi</span>
                      ) : null}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-bpjs-blue transition-colors flex-shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
