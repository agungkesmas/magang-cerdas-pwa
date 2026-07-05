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
  Megaphone
} from 'lucide-react';

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

export default function AdminChatListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'system' | 'manual'>('all');

  useEffect(() => {
    fetch('/api/groups/list?status=all')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setGroups(d.groups || []);
      })
      .finally(() => setLoading(false));
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

  // Sort: system groups first (so admin sees broadcast channels up top)
  const sorted = [...filtered].sort((a, b) => {
    if (a.group_type === 'system' && b.group_type !== 'system') return -1;
    if (a.group_type !== 'system' && b.group_type === 'system') return 1;
    return 0;
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

      {/* Info banner */}
      <div className="bg-bpjs-blue/5 border border-bpjs-blue/20 rounded-xl p-4 flex items-start gap-3">
        <Megaphone className="w-5 h-5 text-bpjs-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700">
          <p className="font-semibold text-bpjs-blue mb-1">Cara kirim pengumuman / broadcast:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Pilih grup sistem (mis. <strong>All Peserta Magang</strong>) untuk broadcast ke semua peserta</li>
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
            return (
              <Link
                key={g.id}
                href={`/admin/chat/${g.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-bpjs-blue/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isSystem
                        ? 'bg-gradient-to-br from-bpjs-blue/15 to-bpjs-blue/5'
                        : 'bg-gradient-to-br from-gray-100 to-gray-50'
                    }`}
                  >
                    {isSystem ? (
                      <Megaphone className="w-6 h-6 text-bpjs-blue" />
                    ) : (
                      <MessageCircle className="w-6 h-6 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h3 className="font-bold text-gray-900 truncate">{g.name}</h3>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          isSystem
                            ? 'bg-bpjs-blue/10 text-bpjs-blue'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {isSystem ? 'Sistem' : g.group_type}
                      </span>
                      {g.department && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full">
                          {g.department}
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <p className="text-xs text-gray-500 truncate">{g.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <UserCog className="w-3 h-3" /> {g.pembina_count} pembina
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {g.peserta_count} peserta
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
