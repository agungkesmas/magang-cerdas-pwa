'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ShareButton from '@/components/shared/ShareButton';
import {
  Zap,
  Flame,
  Clock,
  Award,
  TrendingUp,
  Trophy,
  Loader2,
  Star,
  BookOpen,
  ArrowRight,
  Calendar,
  Target,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { calculateTierProgress } from '@/lib/utils';

interface DashboardData {
  profile: {
    id: string;
    name: string;
    major: string;
    department: string;
    school_origin: string | null;
    start_date: string;
    end_date: string;
    total_exp: number;
    streak_count: number;
    username: string;
    level_info: { level: number; current: number; next: number; progress: number };
    tier: string;
    time_progress: number;
    days_remaining: number;
    duration_days: number;
  };
  today_attendance: any[];
  leaderboard: any[];
  nudges: any[];
}

interface ActiveQuest {
  id: string;
  title: string;
  description: string;
  xp_reward: number;
  is_recurring: boolean;
  due_date: string | null;
  group_id: string;
  group_name: string | null;
  status: 'available' | 'in_progress' | 'completed_today' | 'completed_permanent' | 'overdue';
  started_at: string | null;
  today_xp: number | null;
}

export default function InternHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeQuests, setActiveQuests] = useState<ActiveQuest[]>([]);
  const [questActionLoading, setQuestActionLoading] = useState<string | null>(null);
  const [questError, setQuestError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/intern')
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .finally(() => setLoading(false));
    // Fetch active quests untuk Quick Quest Card
    fetch('/api/intern/active-quests')
      .then((r) => r.json())
      .then((d) => d.success && setActiveQuests(d.quests || []))
      .catch(() => {});
  }, []);

  const refreshQuests = async () => {
    const r = await fetch('/api/intern/active-quests');
    const d = await r.json();
    if (d.success) setActiveQuests(d.quests || []);
  };

  const handleQuickStart = async (questId: string, groupId: string) => {
    setQuestActionLoading(questId);
    setQuestError(null);
    try {
      const res = await fetch('/api/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId, group_id: groupId })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      await refreshQuests();
    } catch (e: any) {
      setQuestError(e.message);
      setTimeout(() => setQuestError(null), 5000);
    } finally {
      setQuestActionLoading(null);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" />
      </div>
    );
  }

  const { profile } = data;
  const { level_info } = profile;
  const checkedIn = data.today_attendance.some((a) => a.type === 'Check-In');
  const checkedOut = data.today_attendance.some((a) => a.type === 'Check-Out');

  // My rank in leaderboard
  const myRank = data.leaderboard.findIndex((l) => l.id === profile.id) + 1;

  // Quest stats untuk Quick Quest Card
  const questAvailable = activeQuests.filter((q) => q.status === 'available');
  const questInProgress = activeQuests.filter((q) => q.status === 'in_progress');
  const questCompletedToday = activeQuests.filter((q) => q.status === 'completed_today');
  const hasPendingQuests = questInProgress.length > 0;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Agent Card */}
      <div className="glass-card p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-bpjs-yellow/20 rounded-full blur-3xl"></div>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-bpjs-yellow to-amber-500 flex items-center justify-center text-bpjs-blue-dark font-bold text-2xl shadow-lg glow-yellow">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">{profile.name}</h1>
              <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-bpjs-yellow" /> LEVEL {level_info.level}
              </span>
            </div>
            <p className="text-sm text-white/60 mt-0.5">
              {profile.major} • {profile.department}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {profile.school_origin || 'Magang BPJS Ketenagakerjaan'}
            </p>
          </div>
        </div>

        {/* EXP Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-bpjs-yellow font-bold">EXP {profile.total_exp}</span>
            <span className="text-white/60">
              {level_info.current} / {level_info.next} → Level {level_info.level + 1}
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-bpjs-yellow to-amber-500 transition-all"
              style={{ width: `${level_info.progress}%` }}
            />
          </div>
        </div>

        {/* Share button — pamer prestasi */}
        <div className="mt-4 flex justify-end">
          <ShareButton
            data={{
              name: profile.name,
              major: profile.major,
              department: profile.department,
              school: profile.school_origin || undefined,
              totalExp: profile.total_exp,
              level: level_info.level,
              tier: profile.tier,
              timeProgress: profile.time_progress,
              daysRemaining: profile.days_remaining,
              streak: profile.streak_count,
              type: 'home'
            }}
            label="Bagikan Prestasi"
            variant="default"
          />
        </div>
      </div>

      {/* Dual Progress */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-bpjs-blue-light" />
            <span className="text-xs text-white/60 font-medium">Waktu Magang</span>
          </div>
          <div className="text-2xl font-bold text-white">{profile.time_progress}%</div>
          <div className="text-xs text-white/50 mt-0.5">{profile.days_remaining} hari tersisa</div>
          <div className="mt-auto pt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-bpjs-blue-light" style={{ width: `${profile.time_progress}%` }} />
          </div>
        </div>

        <div className="glass-card p-4 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-bpjs-green" />
            <span className="text-xs text-white/60 font-medium">Tier saat ini</span>
          </div>
          <div className="text-2xl font-bold text-bpjs-yellow">{profile.tier}</div>
          {(() => {
            const tp = calculateTierProgress(profile.total_exp, profile.start_date, profile.end_date);
            return (
              <>
                <div className="text-xs text-white/50 mt-0.5">
                  {tp.next_tier
                    ? `${(tp.next_tier_exp || 0) - profile.total_exp} EXP lagi ke ${tp.next_tier} (${tp.percentage}% dari maksimal)`
                    : `Tier Excellence tercapai! (${tp.percentage}% dari maksimal)`
                  }
                </div>
                <div className="mt-auto pt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-bpjs-yellow"
                    style={{ width: `${tp.percentage}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Streak + Today status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-400">{profile.streak_count}</div>
            <div className="text-xs text-white/50">Streak Hari</div>
          </div>
        </div>

        <div className="glass-card p-4 flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              checkedIn ? 'bg-bpjs-green/20' : 'bg-white/5'
            }`}
          >
            <Zap className={`w-5 h-5 ${checkedIn ? 'text-bpjs-green' : 'text-white/40'}`} />
          </div>
          <div>
            <div className="text-lg font-bold text-white">
              {checkedIn ? (checkedOut ? 'Selesai!' : 'Sudah Check-In') : 'Belum Check-In'}
            </div>
            <div className="text-xs text-white/50">{checkedIn ? '+20 EXP hari ini' : 'Ayo check-in!'}</div>
          </div>
        </div>
      </div>

      {/* Quick Quest Card — tampilkan quest hari ini dengan tombol START cepat */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Quest Hari Ini</span>
          </div>
          <Link href="/intern/activities" className="text-xs text-bpjs-yellow hover:underline">
            Lihat Semua →
          </Link>
        </div>

        {questError && (
          <div className="mb-2 text-xs text-red-400 bg-red-500/10 border border-red-400/30 rounded p-2">
            {questError}
          </div>
        )}

        {/* Summary chips */}
        <div className="flex items-center gap-2 flex-wrap mb-3 text-xs">
          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full font-medium">
            {questAvailable.length} tersedia
          </span>
          {questInProgress.length > 0 && (
            <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full font-medium">
              {questInProgress.length} sedang dikerjakan
            </span>
          )}
          {questCompletedToday.length > 0 && (
            <span className="px-2 py-1 bg-bpjs-green/20 text-bpjs-green rounded-full font-medium">
              ✓ {questCompletedToday.length} selesai
            </span>
          )}
          {activeQuests.length === 0 && (
            <span className="text-white/40">Belum ada quest hari ini</span>
          )}
        </div>

        {/* Warning: ada quest in_progress (gate check-out) */}
        {hasPendingQuests && checkedIn && !checkedOut && (
          <div className="mb-3 p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              Kamu punya {questInProgress.length} quest yang belum diselesaikan. Selesaikan sebelum check-out sore.
            </p>
          </div>
        )}

        {/* List quest (max 3) */}
        <div className="space-y-2">
          {activeQuests.slice(0, 3).map((q) => (
            <div
              key={q.id}
              className={`p-3 rounded-lg border ${
                q.status === 'in_progress'
                  ? 'border-amber-400/30 bg-amber-500/5'
                  : q.status === 'completed_today'
                  ? 'border-bpjs-green/30 bg-bpjs-green/5'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{q.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-bold">
                      +{q.xp_reward} XP
                    </span>
                    {q.status === 'in_progress' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/30 text-amber-200 rounded-full">
                        ⏳ Sedang dikerjakan
                      </span>
                    )}
                    {q.status === 'completed_today' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-bpjs-green/30 text-bpjs-green rounded-full">
                        ✓ Selesai
                      </span>
                    )}
                  </div>
                </div>
                {/* Action button */}
                {q.status === 'available' && (
                  <button
                    onClick={() => handleQuickStart(q.id, q.group_id)}
                    disabled={questActionLoading === q.id}
                    className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-md disabled:opacity-50 flex items-center gap-1 flex-shrink-0"
                  >
                    {questActionLoading === q.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Target className="w-3 h-3" />
                    )}
                    START
                  </button>
                )}
                {q.status === 'in_progress' && (
                  <Link
                    href={`/intern/chat/${q.group_id}`}
                    className="text-xs px-3 py-1.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-bold rounded-md flex items-center gap-1 flex-shrink-0"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Submit
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {activeQuests.length > 3 && (
          <Link
            href="/intern/activities"
            className="block text-center text-xs text-white/50 hover:text-bpjs-yellow mt-2"
          >
            + {activeQuests.length - 3} quest lagi →
          </Link>
        )}
      </div>

      {/* Survival Kit quick access */}
      <Link href="/intern/survival-kit" className="glass-card p-4 block hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bpjs-blue/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-bpjs-blue-light" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Survival Kit Academy</p>
            <p className="text-xs text-white/50">8 modul dunia kerja: First Day, Komunikasi, Mental Toughness, dll</p>
          </div>
          <ArrowRight className="w-4 h-4 text-white/40" />
        </div>
      </Link>

      {/* Tanggal Merah Bulan Ini — info hari libur */}
      <HolidaysWidget />

      {/* Papan Peringkat mini */}
      {data.leaderboard.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-bpjs-yellow" />
            <span className="text-sm font-semibold text-white">Papan Peringkat</span>
            {myRank > 0 && (
              <span className="text-xs text-bpjs-yellow ml-auto">Anda di peringkat #{myRank}</span>
            )}
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1 leaderboard-scroll">
            {data.leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  entry.id === profile.id ? 'bg-bpjs-yellow/10 border border-bpjs-yellow/30' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    idx === 0
                      ? 'bg-bpjs-yellow text-bpjs-blue-dark'
                      : idx === 1
                      ? 'bg-gray-300 text-gray-700'
                      : idx === 2
                      ? 'bg-orange-400 text-orange-900'
                      : 'bg-white/10 text-white/60'
                  }`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{entry.name}</div>
                  <div className="text-xs text-white/40">{entry.department}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-bpjs-yellow">{entry.total_exp}</div>
                  <div className="text-xs text-white/40">EXP</div>
                </div>
              </div>
            ))}
          </div>
          {data.leaderboard.length > 5 && (
            <div className="mt-2 text-center text-[10px] text-white/40 italic">
              Gulir untuk lihat peringkat 6–{data.leaderboard.length}
            </div>
          )}
        </div>
      )}

      {/* Nudges */}
      {data.nudges.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-bpjs-yellow" />
            <span className="text-sm font-semibold text-white">Notifikasi Terbaru</span>
          </div>
          <div className="space-y-2">
            {data.nudges.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className={`text-sm p-2 rounded-lg ${
                  n.is_read ? 'bg-white/5 text-white/60' : 'bg-bpjs-yellow/10 text-white border border-bpjs-yellow/30'
                }`}
              >
                {n.message}
                <div className="text-xs text-white/40 mt-0.5">
                  {new Date(n.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HolidaysWidget — Tampilkan tanggal merah bulan ini
// ============================================================
function HolidaysWidget() {
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/holidays')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const now = new Date();
          const thisMonth = now.getMonth();
          const thisYear = now.getFullYear();
          // Filter: bulan ini + 7 hari ke depan (untuk early warning)
          const upcoming = (d.holidays || []).filter((h: any) => {
            const d2 = new Date(h.date);
            const diffDays = (d2.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays >= -1 && diffDays <= 30; // dari kemarin sampai 30 hari ke depan
          });
          setHolidays(upcoming);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || holidays.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-bpjs-yellow" />
        <span className="text-sm font-semibold text-white">Tanggal Merah Mendatang</span>
      </div>
      <div className="space-y-1.5">
        {holidays.slice(0, 4).map((h, i) => {
          const d = new Date(h.date);
          const isToday = d.toDateString() === today.toDateString();
          const isPast = d < today;
          return (
            <div
              key={i}
              className={`flex items-center gap-2 text-sm p-1.5 rounded ${
                isToday ? 'bg-bpjs-yellow/20 border border-bpjs-yellow/40' : 'bg-white/5'
              } ${isPast ? 'opacity-50' : ''}`}
            >
              <div className="text-center flex-shrink-0 w-10">
                <div className="text-[10px] text-white/60 uppercase">
                  {d.toLocaleDateString('id-ID', { month: 'short' })}
                </div>
                <div className="text-base font-bold text-white leading-tight">{d.getDate()}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-xs font-medium truncate">{h.name}</div>
                <div className="text-[10px] text-white/50">
                  {d.toLocaleDateString('id-ID', { weekday: 'long' })}
                  {h.type === 'collective' && ' • Cuti Bersama'}
                  {h.type === 'bpjs' && ' • BPJS'}
                </div>
              </div>
              {isToday && (
                <span className="text-[10px] bg-bpjs-yellow text-bpjs-blue-dark font-bold px-1.5 py-0.5 rounded">HARI INI</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/40 mt-2 italic">
        💡 Check-in di hari libur/weekend butuh persetujuan pembina.
      </p>
    </div>
  );
}
