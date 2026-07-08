'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Users, Loader2, ArrowRight, Search, Megaphone, Sparkles } from 'lucide-react';
import SecurityWrapper from '@/components/shared/SecurityWrapper';

function isMadingGroup(g: any): boolean {
  // Kompatibel dengan nama baru 'Mading Pengumuman' dan nama lama 'All Peserta Magang'
  return g.group_type === 'system' && (g.name === 'Mading Pengumuman' || g.name === 'All Peserta Magang');
}

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

  const sortedGroups = [...groups].sort((a, b) => {
    const aMading = isMadingGroup(a) ? 0 : (a.group_type === 'system' ? 1 : 2);
    const bMading = isMadingGroup(b) ? 0 : (b.group_type === 'system' ? 1 : 2);
    if (aMading !== bMading) return aMading - bMading;
    return 0;
  });

  const filtered = sortedGroups.filter((g) => {
    const s = search.toLowerCase();
    const match = !s || g.name.toLowerCase().includes(s) || (g.department || '').toLowerCase().includes(s);
    return match;
  });

  const mading = filtered.filter(isMadingGroup);
  const otherGroups = filtered.filter((g) => !isMadingGroup(g));

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" /></div>;
  }

  return (
    <SecurityWrapper>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Chat Grup
        </h1>
        <p className="text-sm text-white/60 mt-1">
          {filtered.length} grup • Kerjakan quest dari pembina untuk dapat XP
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
        <>
          {mading.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <Megaphone className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                  Mading Pengumuman Kantor
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-amber-400/40 to-transparent" />
              </div>
              {mading.map((g) => (
                <Link
                  key={g.id}
                  href={`/intern/chat/${g.id}`}
                  className="block relative overflow-hidden rounded-2xl border-2 border-amber-400/50 hover:border-amber-400 transition-all group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10" />
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)',
                      backgroundSize: '8px 8px'
                    }}
                  />
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" /> Pengumuman
                  </div>

                  <div className="relative p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                        <Megaphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-amber-300 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base sm:text-lg leading-tight">
                          Mading Pengumuman
                        </h3>
                        <p className="text-xs text-amber-200/80 mt-0.5 line-clamp-1">
                          Pengumuman resmi dari admin & pembina BPJS Ketenagakerjaan
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-white/60 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/10 rounded-full">
                            <Users className="w-2.5 h-2.5" /> {g.peserta_count} peserta
                          </span>
                          <span className="px-1.5 py-0.5 bg-white/10 rounded-full">
                            {g.pembina_count} pembina
                          </span>
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-200 rounded-full">
                            Grup Sistem
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {otherGroups.length > 0 && (
            <div className="space-y-3">
              {mading.length > 0 && (
                <div className="flex items-center gap-2 px-1">
                  <MessageCircle className="w-4 h-4 text-white/40" />
                  <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                    Grup Lainnya
                  </h2>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              )}
              {otherGroups.map((g) => (
                <Link
                  key={g.id}
                  href={`/intern/chat/${g.id}`}
                  className="glass-card p-4 hover:bg-white/5 transition-all block"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bpjs-yellow/20 to-bpjs-yellow/5 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-6 h-6 text-bpjs-yellow" />
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-bold text-white truncate">{g.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-white/60 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 whitespace-nowrap"><Users className="w-3 h-3 flex-shrink-0" /> {g.peserta_count} peserta</span>
                        <span className="whitespace-nowrap">{g.pembina_count} pembina</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
    </SecurityWrapper>
  );
}
