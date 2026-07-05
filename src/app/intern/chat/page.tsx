'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Users, Loader2, ArrowRight, Search } from 'lucide-react';

export default function InternChatListPage() {
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
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Chat Grup
        </h1>
        <p className="text-sm text-white/60 mt-1">
          {groups.length} grup • Kerjakan quest dari pembina untuk dapat XP
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Cari grup..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MessageCircle className="w-12 h-12 mx-auto text-white/30 mb-3" />
          <p className="text-white/60">Belum ada grup yang Anda ikuti.</p>
          <p className="text-white/40 text-xs mt-1">Hubungi admin/pembina untuk ditambahkan ke grup.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((g) => (
            <Link
              key={g.id}
              href={`/intern/chat/${g.id}`}
              className="glass-card p-4 hover:bg-white/5 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bpjs-yellow/20 to-bpjs-yellow/5 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-bpjs-yellow" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white line-clamp-2">{g.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/60 mt-0.5">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.peserta_count} peserta</span>
                    <span>{g.pembina_count} pembina</span>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/40" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
