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
  ArrowRight,
  X,
  Send,
  Mail,
  Clock,
  Zap,
  Tag,
  Gift
} from 'lucide-react';
import QuickGiftModal from '@/components/shared/QuickGiftModal';

export default function PembinaHomePage() {
  const [pembina, setPembina] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [myInterns, setMyInterns] = useState<any[]>([]);
  const [otherInterns, setOtherInterns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignTaskFor, setAssignTaskFor] = useState<any | null>(null);
  const [dmLoading, setDmLoading] = useState<string | null>(null);
  // Tags (sharing dengan admin — pembina bisa toggle tag peserta bimbingan)
  const [tagDropdownFor, setTagDropdownFor] = useState<string | null>(null);
  const [tagLoading, setTagLoading] = useState<string | null>(null); // intern_id yang sedang di-toggle
  const [pendingAttendances, setPendingAttendances] = useState<any[]>([]);
  const [attActionLoading, setAttActionLoading] = useState<string | null>(null);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  // Quick Gift — modal bonus XP cepat (3 klik: tombol Gift → aktivitas → XP)
  const [giftFor, setGiftFor] = useState<{ id: string; name: string } | null>(null);

  // Predefined tags (harus sama dengan admin/interns/page.tsx + API pembina/interns/[id]/tags)
  const PREDEFINED_TAGS = [
    { label: 'Unggul', color: 'bg-green-100 text-green-700 border-green-300' },
    { label: 'Perlu Perhatian', color: 'bg-amber-100 text-amber-700 border-amber-300' },
    { label: 'Leadership', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { label: 'Fast Learner', color: 'bg-purple-100 text-purple-700 border-purple-300' },
    { label: 'Bermasalah', color: 'bg-red-100 text-red-700 border-red-300' }
  ];
  const TAG_COLORS: Record<string, string> = Object.fromEntries(PREDEFINED_TAGS.map(t => [t.label, t.color]));

  async function handleToggleTag(internId: string, tag: string, currentTags: string[] = []) {
    setTagLoading(internId);
    try {
      const res = await fetch(`/api/pembina/interns/${internId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Update state lokal (anti refetch full list)
      setMyInterns(prev => prev.map(i =>
        i.id === internId ? { ...i, tags: data.tags } : i
      ));
    } catch (e: any) {
      alert('Gagal update tag: ' + e.message);
    } finally {
      setTagLoading(null);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/groups/list').then(r => r.json()),
      fetch('/api/leaderboard').then(r => r.json()),
      fetch('/api/pembina/my-interns').then(r => r.json()),
      fetch('/api/pembina/other-interns').then(r => r.json()),
      fetch('/api/pembina/pending-attendances').then(r => r.json()),
      fetch('/api/pembina/active-quests').then(r => r.json()),
    ])
      .then(([groupData, lbData, internsData, otherInternsData, pendingData, questsData]) => {
        if (groupData.success) {
          setGroups(groupData.groups || []);
          setPembina({ name: 'Pembina' });
        }
        if (lbData.success) {
          setLeaderboard(lbData.leaderboard || []);
        }
        if (internsData.success) {
          setMyInterns(internsData.interns || []);
        }
        if (otherInternsData.success) {
          setOtherInterns(otherInternsData.interns || []);
        }
        if (pendingData.success) {
          setPendingAttendances(pendingData.pending || []);
        }
        if (questsData.success) {
          setActiveQuests(questsData.quests || []);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Approve/reject pending attendance
  async function handleAttendanceAction(attendanceId: string, action: 'approve' | 'reject') {
    const note = action === 'reject'
      ? prompt('Alasan penolakan (opsional):') || ''
      : prompt('Catatan untuk peserta (opsional):') || '';
    setAttActionLoading(attendanceId);
    try {
      const res = await fetch('/api/pembina/approve-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendance_id: attendanceId, action, notes: note || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Remove dari list pending
      setPendingAttendances(prev => prev.filter(p => p.id !== attendanceId));
      alert(data.message);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setAttActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  const visibleGroups = groups.filter(g => g.group_type !== 'dm');
  // Fix: jangan SUM count dari semua grup (bakal dobel karena peserta sama ada di multiple grup)
  // totalPeserta: pakai myInterns.length (sudah deduplikasi oleh API my-interns)
  // totalPembina: pakai Math.max dari pembina_count (grup "Diskusi Magang All" berisi semua pembina = jumlah unik)
  const totalPeserta = myInterns.length;
  const totalPembina = Math.max(...visibleGroups.map(g => g.pembina_count || 0), 0);

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
        <Link href="#quest-aktif" className="block">
          <StatCard
            icon={Award}
            label="Quest Aktif"
            value={activeQuests.length}
            color="bg-bpjs-yellow/20 text-amber-700"
            sub={`${activeQuests.filter(q => q.type === 'group').length} grup • ${activeQuests.filter(q => q.type === 'individual').length} pribadi`}
          />
        </Link>
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

      {/* Quest Aktif — list quest grup + tugas individual yang masih aktif */}
      {activeQuests.length > 0 && (
        <div id="quest-aktif" className="bg-white rounded-2xl border border-gray-200 p-5 scroll-mt-20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Target className="w-5 h-5 text-amber-600" /> Quest & Tugas Aktif
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">{activeQuests.length}</span>
            </h2>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 -mr-1">
            {activeQuests.map((quest) => {
              const isGroup = quest.type === 'group';
              const isRecurring = quest.is_recurring;
              const dueDate = quest.due_date ? new Date(quest.due_date) : null;
              const isOverdue = dueDate && dueDate < new Date();
              const content = (
                <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isGroup ? 'bg-purple-50/40 border-purple-200 hover:bg-purple-50' : 'bg-blue-50/40 border-blue-200 hover:bg-blue-50'
                }`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isGroup ? 'bg-purple-100' : 'bg-blue-100'
                  }`}>
                    {isGroup ? <Target className="w-4 h-4 text-purple-600" /> : <Award className="w-4 h-4 text-bpjs-blue" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{quest.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                        isGroup ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-bpjs-blue'
                      }`}>
                        {isGroup ? `🎯 ${quest.group_name}` : `👤 ${quest.intern_name}`}
                      </span>
                      {isRecurring && <span className="text-purple-600">🔁 Harian</span>}
                      {dueDate && (
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          ⏰ {dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          {isOverdue ? ' (lewat)' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {isGroup && (
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                </div>
              );
              return isGroup ? (
                <Link key={quest.id} href={quest.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={quest.id}>{content}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Approval — check-in/out di hari libur/weekend */}
      {pendingAttendances.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Clock className="w-5 h-5 text-amber-600" /> Persetujuan Check-in/out
              <span className="text-xs px-2 py-0.5 bg-amber-500 text-white rounded-full">
                {pendingAttendances.length} pending
              </span>
            </h2>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            Peserta berikut check-in/out di hari libur/weekend. Verifikasi apakah mereka benar ditugaskan pada hari tersebut.
          </p>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 -mr-1">
            {pendingAttendances.map((att) => {
              const internName = att.interns?.name || 'Peserta';
              const internDept = att.interns?.department || '';
              const tanggal = new Date(att.timestamp).toLocaleString('id-ID', {
                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
              });
              const isCheckIn = att.type === 'Check-In';
              return (
                <div key={att.id} className="bg-white rounded-lg p-3 border border-amber-200 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCheckIn ? 'bg-bpjs-green/10' : 'bg-orange-100'
                  }`}>
                    <span className={`text-xs font-bold ${isCheckIn ? 'text-bpjs-green' : 'text-orange-600'}`}>
                      {isCheckIn ? 'IN' : 'OUT'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{internName}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                      <span>{att.type}</span>
                      <span>•</span>
                      <span>{tanggal}</span>
                      {internDept && <><span>•</span><span>{internDept}</span></>}
                    </div>
                    {att.notes && (
                      <p className="text-[11px] text-gray-500 italic mt-0.5 truncate">"{att.notes}"</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleAttendanceAction(att.id, 'approve')}
                      disabled={attActionLoading === att.id}
                      title="Setujui — berikan EXP ke peserta"
                      className="px-3 py-1.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white text-xs font-semibold rounded-md disabled:opacity-50"
                    >
                      {attActionLoading === att.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✓ Setujui'}
                    </button>
                    <button
                      onClick={() => handleAttendanceAction(att.id, 'reject')}
                      disabled={attActionLoading === att.id}
                      title="Tolak — EXP tidak diberikan"
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-md disabled:opacity-50"
                    >
                      ✗ Tolak
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Peserta Saya — list peserta yang dibimbing */}
      {myInterns.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Users className="w-5 h-5 text-purple-600" /> Peserta Saya
            </h2>
            <span className="text-xs text-gray-400">{myInterns.length} peserta aktif</span>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 -mr-1 leaderboard-scroll">
            {myInterns.map((intern) => (
              <div key={intern.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-purple-50/40 transition-colors flex-wrap">
                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">{intern.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{intern.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <span>{intern.major}</span>
                    <span>•</span>
                    <span className={`font-medium ${
                      intern.time_progress >= 80 ? 'text-red-600' :
                      intern.time_progress >= 50 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>{intern.days_remaining} hari tersisa</span>
                  </div>
                  {/* Tags badges — sharing dengan admin (internal, tidak tampil ke peserta) */}
                  {intern.tags && intern.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {intern.tags.map((tag: string) => (
                        <span
                          key={tag}
                          onClick={() => handleToggleTag(intern.id, tag, intern.tags || [])}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border ${TAG_COLORS[tag] || 'bg-gray-100 text-gray-600 border-gray-300'} hover:opacity-70 cursor-pointer`}
                          title={`Klik untuk hapus tag "${tag}"`}
                        >
                          {tag} ✕
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Tag dropdown — click based */}
                  {tagDropdownFor === intern.id && (
                    <div className="mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-sm space-y-1">
                      <p className="text-[10px] text-gray-500 font-medium">Pilih tag:</p>
                      {PREDEFINED_TAGS.map(t => (
                        <button
                          key={t.label}
                          onClick={() => handleToggleTag(intern.id, t.label, intern.tags || [])}
                          disabled={tagLoading === intern.id}
                          className={`block w-full text-left text-[11px] px-2 py-1 rounded ${TAG_COLORS[t.label]} hover:opacity-80 disabled:opacity-50 ${
                            (intern.tags || []).includes(t.label) ? 'font-bold ring-1 ring-offset-1' : ''
                          }`}
                        >
                          {t.label} {(intern.tags || []).includes(t.label) ? '✓' : ''}
                        </button>
                      ))}
                      <button
                        onClick={() => setTagDropdownFor(null)}
                        className="block w-full text-center text-[10px] text-gray-400 hover:text-gray-600 pt-1"
                      >
                        Tutup
                      </button>
                    </div>
                  )}
                  {/* Progress bar */}
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                      <div className={`h-full rounded-full ${
                        intern.time_progress >= 80 ? 'bg-red-400' :
                        intern.time_progress >= 50 ? 'bg-amber-400' :
                        'bg-green-400'
                      }`} style={{ width: `${intern.time_progress}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400">{intern.time_progress}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-bpjs-yellow text-sm">{intern.total_exp}</p>
                  <p className="text-[10px] text-gray-400">EXP</p>
                </div>
                {/* Buttons — wrap ke baris baru di mobile */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end sm:justify-start">
                <button
                  onClick={() => setGiftFor({ id: intern.id, name: intern.name })}
                  title={`🎁 Kasih Bonus XP ke ${intern.name} (Quick Gift)`}
                  className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md flex-shrink-0"
                >
                  <Gift className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setAssignTaskFor(intern)}
                  title={`Beri tugas ke ${intern.name}`}
                  className="p-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md flex-shrink-0"
                >
                  <Target className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTagDropdownFor(tagDropdownFor === intern.id ? null : intern.id)}
                  disabled={tagLoading === intern.id}
                  title={`Tag/Flag ${intern.name} (Unggul, Perlu Perhatian, dll)`}
                  className={`relative p-2 rounded-md flex-shrink-0 disabled:opacity-50 ${
                    (intern.tags || []).length > 0
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {tagLoading === intern.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                  {(intern.tags || []).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {(intern.tags || []).length}
                    </span>
                  )}
                </button>
                <Link
                  href={`/pembina/interns/${intern.id}`}
                  title={`Lihat riwayat aktivitas ${intern.name}`}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-bpjs-blue rounded-md flex-shrink-0"
                >
                  <Clock className="w-4 h-4" />
                </Link>
                <button
                  onClick={async () => {
                    setDmLoading(intern.id);
                    try {
                      const res = await fetch('/api/pembina/dm', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ intern_id: intern.id }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        window.location.href = `/pembina/chat/${data.group_id}`;
                      } else {
                        alert('Error: ' + data.error);
                      }
                    } catch (e: any) {
                      alert('Error: ' + e.message);
                    } finally {
                      setDmLoading(null);
                    }
                  }}
                  disabled={dmLoading === intern.id}
                  title={`Chat langsung dengan ${intern.name}`}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex-shrink-0 disabled:opacity-50"
                >
                  {dmLoading === intern.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Peserta Lain (Collaborator) — peserta di luar bimbingan saya, ada di grup yang sama */}
      {otherInterns.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <Users className="w-5 h-5 text-blue-500" /> Peserta Lain (Collaborator)
            </h2>
            <span className="text-xs text-gray-400">{otherInterns.length} peserta</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            💡 Peserta di luar bimbingan Anda yang ada di grup yang sama (mis. <strong>Diskusi Magang All</strong>). Bisa kasih 🎁 Bonus XP kalau mereka bantu pekerjaan Anda.
          </p>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1 leaderboard-scroll">
            {otherInterns.map((intern) => (
              <div key={intern.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50/40 transition-colors flex-wrap">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-bold text-sm">{intern.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-gray-900 text-sm truncate">{intern.name}</p>
                    {intern.is_cross_department && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium" title={`Berbeda departemen dengan Anda (${intern.department})`}>
                        {intern.department}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap mt-0.5">
                    <span>{intern.major}</span>
                    <span>•</span>
                    <span className={intern.time_progress >= 80 ? 'text-red-600' : intern.time_progress >= 50 ? 'text-amber-600' : 'text-green-600'}>
                      {intern.days_remaining} hari tersisa
                    </span>
                    {intern.shared_groups && intern.shared_groups.length > 0 && (
                      <span className="text-gray-400 italic truncate" title={`Grup yang sama: ${intern.shared_groups.join(', ')}`}>
                        via {intern.shared_groups[0]}{intern.shared_groups.length > 1 ? ` +${intern.shared_groups.length - 1}` : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-bpjs-yellow text-sm">{intern.total_exp}</p>
                  <p className="text-[10px] text-gray-400">EXP</p>
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end sm:justify-start">
                  <button
                    onClick={() => setGiftFor({ id: intern.id, name: intern.name })}
                    title={`🎁 Kasih Bonus XP ke ${intern.name}`}
                    className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-md flex-shrink-0"
                  >
                    <Gift className="w-4 h-4" />
                  </button>
                  <Link
                    href={`/pembina/interns/${intern.id}`}
                    title={`Lihat riwayat aktivitas ${intern.name}`}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-bpjs-blue rounded-md flex-shrink-0"
                  >
                    <Clock className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={async () => {
                      setDmLoading(intern.id);
                      try {
                        const res = await fetch('/api/pembina/dm', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ intern_id: intern.id }),
                        });
                        const data = await res.json();
                        if (data.success) {
                          window.location.href = `/pembina/chat/${data.group_id}`;
                        } else {
                          alert('Error: ' + data.error);
                        }
                      } catch (e: any) {
                        alert('Error: ' + e.message);
                      } finally {
                        setDmLoading(null);
                      }
                    }}
                    disabled={dmLoading === intern.id}
                    title={`Chat langsung dengan ${intern.name}`}
                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md flex-shrink-0 disabled:opacity-50"
                  >
                    {dmLoading === intern.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {visibleGroups.map((g) => (
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

      {/* Leaderboard — Top 10 scrollable */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
              <TrendingUp className="w-5 h-5 text-bpjs-yellow" /> Papan Peringkat EXP
            </h2>
            <span className="text-xs text-gray-400">Top 10 peserta magang</span>
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1 leaderboard-scroll">
            {leaderboard.map((entry, idx) => (
              <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-purple-50/40 transition-colors">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  idx === 0 ? 'bg-bpjs-yellow text-bpjs-blue-dark' :
                  idx === 1 ? 'bg-gray-300 text-gray-700' :
                  idx === 2 ? 'bg-orange-400 text-orange-900' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{entry.name}</p>
                  <p className="text-xs text-gray-500">{entry.department} • {entry.major}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-bpjs-yellow text-sm">{entry.total_exp}</p>
                  <p className="text-xs text-gray-400">EXP</p>
                </div>
              </div>
            ))}
          </div>
          {leaderboard.length > 5 && (
            <div className="mt-2 text-center text-[10px] text-gray-400 italic">
              Gulir untuk lihat peringkat 6–{leaderboard.length}
            </div>
          )}
        </div>
      )}

      {/* Assign Task Modal */}
      {assignTaskFor && (
        <AssignTaskModal
          intern={assignTaskFor}
          onClose={() => setAssignTaskFor(null)}
          onSuccess={() => {
            setAssignTaskFor(null);
            alert('Tugas berhasil diberikan!');
          }}
        />
      )}

      {/* Quick Gift Modal — Bonus XP cepat ke aktivitas peserta */}
      {giftFor && (
        <QuickGiftModal
          internId={giftFor.id}
          internName={giftFor.name}
          onClose={() => setGiftFor(null)}
          onSuccess={(newTotalExp) => {
            // Update EXP peserta di list myInterns ATAU otherInterns supaya langsung refleksi
            setMyInterns((prev) => prev.map((i) =>
              i.id === giftFor.id ? { ...i, total_exp: newTotalExp } : i
            ));
            setOtherInterns((prev) => prev.map((i) =>
              i.id === giftFor.id ? { ...i, total_exp: newTotalExp } : i
            ));
          }}
        />
      )}
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

// ============================================================
// AssignTaskModal — Pembina beri tugas individual ke peserta
// ============================================================
function AssignTaskModal({ intern, onClose, onSuccess }: { intern: any; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // XP default 20 — tidak bisa di-set pembina (konsisten dengan Quest deploy)
  // Pembina bisa kasih Bonus XP setelah peserta submit (lihat QuestCard di chat grup)
  const xp = 20;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/pembina/assign-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intern_id: intern.id,
          title: title.trim(),
          description: description.trim(),
          xp_reward: xp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" /> Beri Tugas
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-purple-50 rounded-lg p-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-600 font-bold">{intern.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{intern.name}</p>
            <p className="text-xs text-gray-500">{intern.major} • {intern.department}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Tugas *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pelajari alur JKK"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tugas yang harus dikerjakan..."
              required
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">XP Reward (default)</label>
            <div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-700 flex items-center gap-2">
              <Zap className="w-4 h-4 text-bpjs-yellow" />
              <span className="font-semibold">20 XP</span>
              <span className="text-xs text-gray-500 ml-auto">+ Bonus dari pembina setelah submit</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Setelah peserta menyelesaikan tugas, Anda bisa kasih Bonus XP (1-100) jika kerja luar biasa.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Beri Tugas ke {intern.name.split(' ')[0]}
          </button>
        </form>
      </div>
    </div>
  );
}
