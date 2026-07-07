'use client';

import { useState, useEffect } from 'react';
import ShareButton from '@/components/shared/ShareButton';
import {
  Award,
  Loader2,
  Search,
  ExternalLink,
  Star,
  FileText
} from 'lucide-react';
import { calculateTier } from '@/lib/utils';

interface Intern {
  id: string;
  name: string;
  major: string;
  department: string;
  school_origin: string;
  start_date?: string;
  end_date?: string;
  total_exp: number;
  certificate_unlocked: boolean;
  certificate_id: string | null;
  time_progress: number;
  days_remaining: number;
  tier?: string;
}

export default function BKKCertsPage() {
  return <BKKCertsContent />;
}

function BKKCertsContent() {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'certified' | 'pending'>('all');

  useEffect(() => {
    fetch('/api/dashboard/bkk')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInterns(d.interns || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const certified = interns.filter((i) => i.certificate_unlocked);
  // "Siap diterbitkan" = tier Competent atau Excellence (>= 25% max_exp)
  const pending = interns.filter((i) => {
    if (i.certificate_unlocked) return false;
    const tier = calculateTier(i.total_exp, i.start_date, i.end_date);
    return tier === 'Competent' || tier === 'Excellence';
  });

  const filtered = interns.filter((i) => {
    if (filter === 'certified' && !i.certificate_unlocked) return false;
    if (filter === 'pending') {
      if (i.certificate_unlocked) return false;
      const tier = calculateTier(i.total_exp, i.start_date, i.end_date);
      if (tier === 'Participation') return false;
    }
    if (!i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tierLabel = (exp: number, startDate?: string, endDate?: string) => {
    const tier = calculateTier(exp, startDate, endDate);
    if (tier === 'Excellence') return { label: 'Excellence', color: 'bg-bpjs-yellow text-bpjs-blue-dark', icon: '🏆' };
    if (tier === 'Competent') return { label: 'Competent', color: 'bg-bpjs-green text-white', icon: '✅' };
    return { label: 'Participation', color: 'bg-gray-200 text-gray-700', icon: '📋' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-green" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Arsip Sertifikat
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {certified.length} sertifikat terbit • {pending.length} siap diterbitkan • {interns.length} total peserta
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-bpjs-green" />
            <span className="text-xs text-gray-500">Sertifikat Terbit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{certified.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-5 h-5 text-amber-500" />
            <span className="text-xs text-gray-500">Siap Diterbitkan</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{pending.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-gray-400" />
            <span className="text-xs text-gray-500">Belum Memenuhi</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{interns.length - certified.length - pending.length}</div>
        </div>
      </div>

      {/* Share capaian */}
      {certified.length > 0 && (
        <div className="flex justify-end">
          <ShareButton
            data={{
              title: 'Sertifikat Magang BPJS',
              text: `🏆 ${certified.length} peserta magang dari sekolah kami telah mendapatkan sertifikat resmi dari BPJS Ketenagakerjaan Cabang Cirebon!\n\nProgram MAGANG-CERDAS — kerjasama BKK dengan BPJS Ketenagakerjaan.\n\n#MagangBPJS #SertifikatMagang #BPJSKetenagakerjaan #BKK`,
              url: typeof window !== 'undefined' ? window.location.origin : ''
            }}
            label="Bagikan Capaian"
            variant="card"
          />
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama peserta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
          />
        </div>
        {(['all', 'certified', 'pending'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === f ? 'bg-bpjs-green text-white' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            {f === 'all' ? `Semua (${interns.length})` : f === 'certified' ? `Terbit (${certified.length})` : `Siap (${pending.length})`}
          </button>
        ))}
      </div>

      {/* Certificate list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada sertifikat pada filter ini.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Peserta</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Jurusan</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Departemen</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">EXP</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((intern) => {
                  const tier = tierLabel(intern.total_exp, intern.start_date, intern.end_date);
                  return (
                    <tr key={intern.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{intern.name}</div>
                        <div className="text-xs text-gray-400">{intern.school_origin}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{intern.major}</td>
                      <td className="px-4 py-3 text-gray-600">{intern.department}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{intern.total_exp}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tier.color}`}>
                          {tier.icon} {tier.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {intern.certificate_unlocked ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-bpjs-green/10 text-bpjs-green rounded-full font-medium">
                            <Award className="w-3 h-3" /> Terbit
                          </span>
                        ) : (() => {
                          const t = calculateTier(intern.total_exp, intern.start_date, intern.end_date);
                          return t === 'Competent' || t === 'Excellence' ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                              ⏳ Siap Diterbitkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">
                              Belum Memenuhi
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        {intern.certificate_unlocked ? (
                          <a
                            href={`/bkk/interns?id=${intern.id}`}
                            className="inline-flex items-center gap-1 text-xs text-bpjs-green hover:underline font-medium"
                          >
                            <ExternalLink className="w-3 h-3" /> Lihat Detail
                          </a>
                        ) : (
                          <a
                            href={`/bkk/interns?id=${intern.id}`}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> Detail
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        💡 Untuk melihat sertifikat lengkap (dengan TTD Kepala Cabang + verification ID), klik "Lihat Detail" pada peserta yang sertifikatnya sudah terbit. Admin BPJS yang menerbitkan sertifikat — BKK hanya dapat melihat arsip.
      </div>
    </div>
  );
}
