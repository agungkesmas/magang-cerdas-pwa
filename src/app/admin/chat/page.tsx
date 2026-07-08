'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Users,
  Loader2,
  ArrowRight,
  Search,
  UserCog,
  Building2,
  Megaphone,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { fetchFresh } from '@/lib/fresh-fetch';

interface Group {
  id: string;
  name: string;
  description: string | null;
  group_type: string;
  department: string | null;
  created_by_name: string;
  is_active: boolean;
  pembina_count: number;
  peserta_count: number;
}

// Deteksi grup Mading (broadcast channel — semua peserta)
// Kompatibel dengan nama baru 'Mading Pengumuman' dan nama lama 'All Peserta Magang'
function isMadingGroup(g: Group): boolean {
  return g.group_type === 'system' && !g.department &&
    (g.name === 'Mading Pengumuman' || g.name === 'All Peserta Magang');
}

export default function AdminChatListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'system' | 'manual'>('all');

  const fetchGroups = () => {
    setLoading(true);
    fetchFresh('/api/groups/list?status=all')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setGroups(d.groups || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const filtered = groups.filter((g) => {
    const s = search.toLowerCase();
    const matchSearch = !s
      || g.name.toLowerCase().includes(s)
      || (g.department || '').toLowerCase().includes(s);
    const matchFilter = filter === 'all'
      || (filter === 'system' && g.group_type === 'system')
      || (filter === 'manual' && g.group_type !== 'system');
    return matchSearch && matchFilter && g.is_active;
  });

  // Sort: Mading group first, then other system groups, then manual
  const sorted = [...filtered].sort((a, b) => {
    const aRank = isMadingGroup(a) ? 0 : (a.group_type === 'system' ? 1 : 2);
    const bRank = isMadingGroup(b) ? 0 : (b.group_type === 'system' ? 1 : 2);
    return aRank - bRank;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
          >
            Chat Grup
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Kirim pengumuman, tugas, atau info ke grup peserta magang — WhatsApp-style
          </p>
        </div>
        <button
          onClick={fetchGroups}
          disabled={loading}
          className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-3 py-2 rounded-lg shadow-sm disabled:opacity-50"
          title="Refresh data grup (bypass cache)"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-bpjs-blue/5 border border-bpjs-blue/20 rounded-xl p-4 flex items-start gap-3">
        <Megaphone className="w-5 h-5 text-bpjs-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-bpjs-blue mb-1">Cara kirim pengumuman / broadcast:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Pilih grup <strong>Mading Pengumuman</strong> (broadcast ke semua peserta magang aktif)</li>
            <li>Atau pilih grup departemen (mis. <strong>Magang - Pemasaran</strong>) untuk pengumuman departemen</li>
            <li>Tulis pesan / upload file → peserta terima realtime di chat grup mereka</li>
          </ol>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari grup..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bpjs-blue/40"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'system', 'manual'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-bpjs-blue text-white shadow-sm'
                  : 'text-gray-600 bg-white border border-gray-200'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'system' ? 'Sistem' : 'Manual'}
            </button>
          ))}
        </div>
      </div>

      {/* Group list */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Tidak ada grup yang cocok.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {sorted.map((g) => {
            const isSystem = g.group_type === 'system';
            const isMading = isMadingGroup(g);
            // Label tampilan: untuk grup All Peserta Magang (legacy), tampilkan 'Mading Pengumuman'
            const displayName = isMading && g.name === 'All Peserta Magang' ? 'Mading Pengumuman' : g.name;
            return (
              <Link
                key={g.id}
                href={`/admin/chat/${g.id}`}
                className={`rounded-xl border p-4 hover:shadow-md transition-all relative overflow-hidden ${
                  isMading
                    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 hover:border-amber-400'
                    : isSystem
                      ? 'bg-white border-gray-200 hover:border-bpjs-blue/30'
                      : 'bg-white border-gray-200 hover:border-bpjs-blue/30'
                }`}
              >
                {isMading && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Broadcast
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isMading
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/30'
                        : isSystem
                          ? 'bg-gradient-to-br from-bpjs-blue/15 to-bpjs-blue/5'
                          : 'bg-gradient-to-br from-gray-100 to-gray-50'
                    }`}
                  >
                    {isMading ? (
                      <Megaphone className="w-6 h-6 text-white" />
                    ) : isSystem ? (
                      <MessageCircle className="w-6 h-6 text-bpjs-blue" />
                    ) : (
                      <MessageCircle className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-bold leading-tight ${isMading ? 'text-amber-900' : 'text-gray-900'}`}>
                      {displayName}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isMading
                            ? 'bg-amber-200 text-amber-900'
                            : isSystem
                              ? 'bg-bpjs-blue/10 text-bpjs-blue'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isMading ? 'Mading' : isSystem ? 'Sistem' : g.group_type}
                      </span>
                      {g.department && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full">
                          {g.department}
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <p className={`text-xs truncate ${isMading ? 'text-amber-700' : 'text-gray-500'}`}>
                        {isMading ? 'Pengumuman resmi dari admin & pembina BPJS Ketenagakerjaan' : g.description}
                      </p>
                    )}
                    <div className={`flex items-center gap-3 text-xs mt-1 ${isMading ? 'text-amber-700' : 'text-gray-500'}`}>
                      <span className="flex items-center gap-1">
                        <UserCog className="w-3 h-3" /> {g.pembina_count} pembina
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {g.peserta_count} peserta
                      </span>
                    </div>
                  </div>
                  <ArrowRight className={`w-5 h-5 ${isMading ? 'text-amber-500' : 'text-gray-400'}`} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
