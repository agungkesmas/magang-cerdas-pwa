'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home as HomeIcon,
  MessageCircle,
  Users,
  Loader2,
  Sparkles,
  Target,
  Award,
  TrendingUp,
  ArrowRight
} from 'lucide-react';

export default function PembinaHomePage() {
  const [pembina, setPembina] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/groups/list')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setGroups(d.groups || []);
          // Get pembina info from first group's my_role or fallback
          setPembina({ name: 'Pembina' }); // Will be enhanced later
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const totalPembina = groups.reduce((sum, g) => sum + (g.pembina_count || 0), 0);
  const totalPeserta = groups.reduce((sum, g) => sum + (g.peserta_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-bpjs-yellow/10 rounded-full" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-bpjs-yellow" />
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Dashboard Pembina
              </h1>
              <p className="text-white/80 text-sm">
                {groups.length} grup dibimbing • {totalPeserta} peserta magang
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Grup Dibimbing"
          value={groups.length}
          color="bg-purple-100 text-purple-700"
          sub="grup aktif"
        />
        <StatCard
          icon={Target}
          label="Total Peserta"
          value={totalPeserta}
          color="bg-bpjs-blue/10 text-bpjs-blue"
          sub="peserta magang"
        />
        <StatCard
          icon={Users}
          label="Total Pembina"
          value={totalPembina}
          color="bg-bpjs-green/10 text-bpjs-green"
          sub="dalam grup saya"
        />
        <StatCard
          icon={Award}
          label="Quest Aktif"
          value="—"
          color="bg-bpjs-yellow/20 text-amber-700"
          sub="lihat chat grup"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Link
          href="/pembina/groups"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all"
        >
          <Users className="w-6 h-6 text-purple-600 mb-2" />
          <p className="font-semibold text-gray-900 text-sm">Grup Saya</p>
          <p className="text-xs text-gray-500 mt-0.5">Lihat & kelola anggota</p>
        </Link>
        <Link
          href="/pembina/chat"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all"
        >
          <MessageCircle className="w-6 h-6 text-bpjs-blue mb-2" />
          <p className="font-semibold text-gray-900 text-sm">Chat Grup</p>
          <p className="text-xs text-gray-500 mt-0.5">Buka chat & deploy quest</p>
        </Link>
        <Link
          href="/pembina/chat"
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-purple-300 transition-all col-span-2 lg:col-span-1"
        >
          <Target className="w-6 h-6 text-bpjs-green mb-2" />
          <p className="font-semibold text-gray-900 text-sm">Deploy Quest</p>
          <p className="text-xs text-gray-500 mt-0.5">Buat tugas baru</p>
        </Link>
      </div>

      {/* List Grup */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Grup yang Saya Bimbing
          </h2>
          <Link href="/pembina/chat" className="text-sm text-purple-600 hover:underline font-medium">
            Buka Chat →
          </Link>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-gray-500 text-sm">Belum ada grup yang dibimbing.</p>
            <p className="text-gray-400 text-xs mt-1">Hubungi admin untuk ditambahkan ke grup.</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/pembina/chat/${g.id}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-purple-300 hover:bg-purple-50/30 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-purple-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{g.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {g.peserta_count} peserta</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" /> {g.pembina_count} pembina</span>
                    {g.department && <span>• {g.department}</span>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: any; color: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}
