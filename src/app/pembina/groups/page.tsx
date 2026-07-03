'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  Users,
  Loader2,
  ArrowRight,
  Search
} from 'lucide-react';

export default function PembinaGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/groups/list')
      .then((r) => r.json())
      .then((d) => { if (d.success) setGroups(d.groups || []); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = groups.filter((g) => {
    const s = search.toLowerCase();
    return !s || g.name.toLowerCase().includes(s) || (g.department || '').toLowerCase().includes(s);
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Grup Chat Saya
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {groups.length} grup aktif • Klik untuk buka chat & deploy quest
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari grup..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Belum ada grup.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((g) => (
            <Link
              key={g.id}
              href={`/pembina/chat/${g.id}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-purple-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-900">{g.name}</h3>
                    {g.department && <span className="text-xs px-2 py-0.5 bg-bpjs-blue/10 text-bpjs-blue rounded-full">{g.department}</span>}
                    {g.my_role === 'group_admin' && <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-blue-dark rounded-full">Admin</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.peserta_count} peserta</span>
                    <span>{g.pembina_count} pembina</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
