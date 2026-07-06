'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Flame, Loader2, ChevronUp, ChevronDown } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  name: string;
  major: string;
  department: string;
  total_exp: number;
  streak_count: number;
}

interface Props {
  /** Tampilkan filter departemen (default: true) */
  showDepartmentFilter?: boolean;
  /** Limit jumlah peserta yang ditampilkan (default: 10) */
  limit?: number;
  /** Accent color: 'blue' untuk admin, 'green' untuk BKK */
  accent?: 'blue' | 'green';
}

export default function LeaderboardPanel({
  showDepartmentFilter = true,
  limit = 10,
  accent = 'blue'
}: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setEntries(d.leaderboard || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const departments = Array.from(new Set(entries.map((e) => e.department).filter(Boolean)));
  const filtered = filterDept === 'all'
    ? entries
    : entries.filter((e) => e.department === filterDept);
  const top = filtered.slice(0, limit);

  const accentBg = accent === 'blue' ? 'from-bpjs-blue to-bpjs-blue-light' : 'from-bpjs-green to-bpjs-green-dark';
  const accentText = accent === 'blue' ? 'text-bpjs-blue' : 'text-bpjs-green';
  const accentBgSoft = accent === 'blue' ? 'bg-bpjs-blue/10' : 'bg-bpjs-green/10';

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-center py-4">
          <Loader2 className={`w-5 h-5 animate-spin ${accentText}`} />
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full bg-gradient-to-r ${accentBg} text-white p-4 flex items-center justify-between`}
      >
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-bpjs-yellow" />
          <div className="text-left">
            <h2 className="font-bold text-base">Leaderboard Peserta Magang</h2>
            <p className="text-xs text-white/80">
              Top {Math.min(limit, filtered.length)} dari {filtered.length} peserta aktif
            </p>
          </div>
        </div>
        {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
      </button>

      {!collapsed && (
        <div>
          {/* Filter */}
          {showDepartmentFilter && departments.length > 1 && (
            <div className="px-4 pt-3 pb-2 flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterDept('all')}
                className={`text-xs px-3 py-1 rounded-full font-medium ${
                  filterDept === 'all' ? `${accentBgSoft} ${accentText}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Semua Departemen
              </button>
              {departments.map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDept(d)}
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    filterDept === d ? `${accentBgSoft} ${accentText}` : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}

          {/* Leaderboard list */}
          <div className="divide-y divide-gray-100">
            {top.map((entry, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const medalColor = rank === 1 ? 'text-yellow-500' : rank === 2 ? 'text-gray-400' : rank === 3 ? 'text-orange-600' : 'text-gray-300';
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 ${rank <= 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''}`}
                >
                  {/* Rank */}
                  <div className="w-8 flex-shrink-0 flex items-center justify-center">
                    {isTop3 ? (
                      <Medal className={`w-5 h-5 ${medalColor}`} />
                    ) : (
                      <span className="text-sm font-bold text-gray-400">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full ${accentBgSoft} flex items-center justify-center flex-shrink-0`}>
                    <span className={`font-bold text-sm ${accentText}`}>{entry.name.charAt(0).toUpperCase()}</span>
                  </div>

                  {/* Name & meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm truncate">{entry.name}</p>
                      {rank === 1 && <Award className="w-3.5 h-3.5 text-bpjs-yellow flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="truncate">{entry.department}</span>
                      <span>•</span>
                      <span className="truncate">{entry.major}</span>
                    </div>
                  </div>

                  {/* EXP & streak */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {entry.streak_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-orange-600" title="Streak hari">
                        <Flame className="w-3.5 h-3.5" />
                        {entry.streak_count}
                      </span>
                    )}
                    <div className="text-right">
                      <div className={`font-bold text-sm ${accentText}`}>{entry.total_exp}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">EXP</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-500">
              Leaderboard di-update real-time. EXP dihitung otomatis dari check-in, quest completion, dan aktivitas lainnya. Sertifikat diterbitkan berdasarkan completion & durasi magang — bukan peringkat leaderboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
