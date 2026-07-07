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
  Calendar
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

export default function InternHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/intern')
      .then((r) => r.json())
      .then((d) => d.success && setData(d))
      .finally(() => setLoading(false));
  }, []);

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

      {/* Leaderboard mini */}
      {data.leaderboard.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-bpjs-yellow" />
            <span className="text-sm font-semibold text-white">Leaderboard</span>
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
