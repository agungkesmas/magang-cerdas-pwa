'use client';

import { useState, useEffect } from 'react';
import SecurityWrapper from '@/components/shared/SecurityWrapper';
import {
  CheckSquare,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  Sparkles,
  Plus,
  X,
  Send,
  FileText,
  History,
  Calendar,
  Repeat,
  Target,
  MessageCircle
} from 'lucide-react';

interface Activity {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  is_completed: boolean;
  my_completion: string | null;
  is_overdue: boolean;
  created_by_intern: boolean;
  created_at: string;
  // Recurring fields
  is_recurring?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  skip_weekend?: boolean;
  // Quest fields
  is_quest?: boolean;
  group_id?: string | null;
  xp_reward?: number;
  quest_status?: string | null;
  quest_started_at?: string | null;
  quest_submitted_at?: string | null;
  quest_xp_awarded?: number | null;
  daily_deadline_hour?: number;
  is_today_in_range?: boolean;
  completed_today?: boolean;
  today_completion?: any;
  progress_completed_days?: number;
  progress_total_days?: number;
  is_past_daily_deadline?: boolean;
  my_daily_history?: any[];
}

interface HistoryItem {
  id: string;
  title: string;
  description: string;
  completion_notes: string | null;
  completed_at: string;
  started_at?: string;
  source: string;
  mode?: string;
  exp_gained?: number;
  group_name?: string | null;
  group_department?: string | null;
  deadline?: string | null;
}

interface RecurringHistoryItem {
  id: string;
  activity_id: string;
  title: string;
  description: string;
  mode: 'recurring';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  source: string;
  daily_completions: any[];
  total_exp_gained: number;
  last_completed_at: string;
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
  group_department: string | null;
  status: 'available' | 'in_progress' | 'completed_today' | 'completed_permanent' | 'overdue';
  started_at: string | null;
  today_xp: number | null;
}

export default function InternActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeQuests, setActiveQuests] = useState<ActiveQuest[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [recurringHistory, setRecurringHistory] = useState<RecurringHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [questActionLoading, setQuestActionLoading] = useState<string | null>(null);
  const [recentExp, setRecentExp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [showQuestSubmitModal, setShowQuestSubmitModal] = useState<string | null>(null);
  const [questSubmitNotes, setQuestSubmitNotes] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [actRes, histRes, questRes] = await Promise.all([
        fetch('/api/activities/list'),
        fetch('/api/activities/history'),
        fetch('/api/intern/active-quests')
      ]);
      const actData = await actRes.json();
      const histData = await histRes.json();
      const questData = await questRes.json();
      if (actData.success) {
        // Filter out quests — they come from active-quests API now
        setActivities((actData.activities || []).filter((a: Activity) => !a.is_quest));
      }
      if (histData.success) {
        setHistory(histData.history || []);
        setRecurringHistory(histData.recurring_history || []);
      }
      if (questData.success) {
        setActiveQuests(questData.quests || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleComplete = async (id: string) => {
    setCompleting(id);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/activities/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity_id: id, completion_notes: completionNotes.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        const totalGain = data.total_exp_gained || data.exp_gained || 0;
        const bonus = data.bonus_exp || 0;
        setRecentExp(totalGain);
        if (data.all_complete && bonus > 0) {
          setErrorMsg(`🎉 Selamat! Anda menyelesaikan SEMUA hari kerja. Bonus +${bonus} EXP!`);
          setTimeout(() => setErrorMsg(null), 5000);
        }
        setTimeout(() => setRecentExp(null), 3000);
        setShowCompleteModal(null);
        setCompletionNotes('');
        fetchAll();
      } else {
        setErrorMsg(data.error);
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setCompleting(null);
    }
  };

  // Quest START/SUBMIT handlers — langsung dari Aktivitas (tidak perlu buka chat)
  const handleQuestStart = async (questId: string, groupId: string) => {
    setQuestActionLoading(questId);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/quests/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId, group_id: groupId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchAll();
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setQuestActionLoading(null);
    }
  };

  const handleQuestSubmit = async (questId: string, groupId: string) => {
    setQuestActionLoading(questId);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/quests/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quest_id: questId, group_id: groupId, submission_notes: questSubmitNotes.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecentExp(data.xp_gained || 20);
      setTimeout(() => setRecentExp(null), 3000);
      setShowQuestSubmitModal(null);
      setQuestSubmitNotes('');
      fetchAll();
    } catch (e: any) {
      setErrorMsg(e.message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setQuestActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" /></div>;
  }

  // Filter logic: exclude quests (they come from active-quests API now)
  const visibleActivities = activities.filter((a) => !a.is_quest);
  const pending = visibleActivities.filter((a) => {
    if (a.is_recurring) return !a.completed_today && a.is_today_in_range !== false;
    return !a.is_completed && !a.is_overdue;
  });
  const completed = visibleActivities.filter((a) => {
    if (a.is_recurring) return a.completed_today;
    return false;
  });
  const overdue = visibleActivities.filter((a) => !a.is_recurring && !a.is_completed && a.is_overdue);

  // Quest filtering
  const questAvailable = activeQuests.filter(q => q.status === 'available');
  const questInProgress = activeQuests.filter(q => q.status === 'in_progress');
  const questCompletedToday = activeQuests.filter(q => q.status === 'completed_today');
  const questOverdue = activeQuests.filter(q => q.status === 'overdue');
  const questActiveCount = questAvailable.length + questInProgress.length + questCompletedToday.length + questOverdue.length;

  return (
    <SecurityWrapper>
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Aktivitas Hari Ini
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {questActiveCount + pending.length} aktif • {questCompletedToday.length + completed.length} selesai
          </p>
        </div>
        {recentExp && (
          <div className="inline-flex items-center gap-1 bg-bpjs-yellow text-bpjs-blue-dark px-3 py-1.5 rounded-full font-bold text-sm animate-bounce-small">
            <Zap className="w-4 h-4" /> +{recentExp} EXP
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="glass-card p-3 bg-red-500/10 border-red-400/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Tab: Active vs History */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'active' ? 'bg-bpjs-yellow text-bpjs-blue-dark' : 'bg-white/5 text-white/60'}`}
        >
          <CheckSquare className="w-4 h-4 inline mr-1" /> Aktif ({questActiveCount + pending.length + completed.length + overdue.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'history' ? 'bg-bpjs-yellow text-bpjs-blue-dark' : 'bg-white/5 text-white/60'}`}
        >
          <History className="w-4 h-4 inline mr-1" /> Riwayat ({history.length})
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="ml-auto px-3 py-2 bg-bpjs-yellow/10 hover:bg-bpjs-yellow/20 border border-bpjs-yellow/30 text-bpjs-yellow text-sm font-medium rounded-lg flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>

      {/* Active tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {/* === QUEST HARI INI === */}
          {activeQuests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-400" /> Quest ({activeQuests.length})
              </h2>
              {activeQuests.map((q) => (
                <div key={q.id} className="glass-card p-4 border-purple-400/30">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white">{q.title}</h3>
                        <span className="text-xs px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded-full font-medium flex items-center gap-1">
                          <Target className="w-3 h-3" /> Quest
                        </span>
                        {q.is_recurring && (
                          <span className="text-xs px-2 py-0.5 bg-bpjs-green/20 text-bpjs-green rounded-full font-medium">🔁 Harian</span>
                        )}
                        <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {q.xp_reward} XP
                        </span>
                        {q.group_name && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full flex items-center gap-1">
                            📌 {q.group_name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed mt-1">{q.description}</p>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  {q.status === 'available' && (
                    <button
                      onClick={() => handleQuestStart(q.id, q.group_id)}
                      disabled={questActionLoading === q.id}
                      className="w-full mt-2 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50"
                    >
                      {questActionLoading === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} MULAI QUEST
                    </button>
                  )}

                  {q.status === 'in_progress' && (
                    showQuestSubmitModal === q.id ? (
                      <div className="mt-3 space-y-2">
                        <textarea
                          rows={2}
                          value={questSubmitNotes}
                          onChange={(e) => setQuestSubmitNotes(e.target.value)}
                          placeholder="Catatan hasil (opsional)..."
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => { setShowQuestSubmitModal(null); setQuestSubmitNotes(''); }} className="flex-1 px-3 py-2 border border-white/10 text-white/60 text-sm rounded-lg">Batal</button>
                          <button onClick={() => handleQuestSubmit(q.id, q.group_id)} disabled={questActionLoading === q.id} className="flex-1 px-3 py-2 bg-bpjs-green text-white font-bold text-sm rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
                            {questActionLoading === q.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Kirim Quest
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setShowQuestSubmitModal(q.id); setQuestSubmitNotes(''); }}
                        className="w-full mt-2 flex items-center justify-center gap-2 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-bold py-2.5 rounded-lg text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> KIRIM QUEST
                      </button>
                    )
                  )}

                  {q.status === 'completed_today' && (
                    <div className="mt-2 bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-bpjs-green" />
                      <div>
                        <p className="font-semibold text-bpjs-green text-sm">✓ Selesai hari ini!</p>
                        <p className="text-xs text-white/60">+{q.today_xp || q.xp_reward} XP • Kembali besok untuk kerjakan lagi</p>
                      </div>
                    </div>
                  )}

                  {q.status === 'completed_permanent' && (
                    <div className="mt-2 bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-bpjs-green" />
                      <p className="font-semibold text-bpjs-green text-sm">Quest Selesai!</p>
                    </div>
                  )}

                  {q.status === 'overdue' && (
                    <div className="mt-2 text-center text-sm text-red-400 py-2">
                      <AlertTriangle className="w-4 h-4 inline mr-1" /> Quest sudah lewat deadline
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* === TUGAS DEPARTEMEN === */}
          {activeQuests.length === 0 && activities.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <CheckSquare className="w-12 h-12 mx-auto text-white/30 mb-3" />
              <p className="text-white/60">Belum ada aktivitas yang ditugaskan.</p>
              <p className="text-white/40 text-xs mt-1">Klik "Tambah" untuk catat aktivitas tambahan yang kamu kerjakan.</p>
            </div>
          ) : (
            <>
              {/* Pending */}
              {pending.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-bpjs-yellow" /> Aktif ({pending.length})
                  </h2>
                  {pending.map((act) => (
                    <div key={act.id} className={`glass-card p-4 ${act.is_quest ? 'border-purple-400/40' : ''}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white">{act.title}</h3>
                            {act.is_quest && (
                              <span className="text-xs px-2 py-0.5 bg-purple-500/30 text-purple-200 rounded-full font-medium flex items-center gap-1">
                                <Target className="w-3 h-3" /> Quest
                              </span>
                            )}
                            {act.is_recurring && (
                              <span className="text-xs px-2 py-0.5 bg-bpjs-green/20 text-bpjs-green rounded-full font-medium flex items-center gap-1">
                                🔁 Harian
                              </span>
                            )}
                            {act.created_by_intern && !act.is_quest && (
                              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">Dibuat sendiri</span>
                            )}
                            {act.is_quest && act.xp_reward && (
                              <span className="text-xs px-2 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-medium flex items-center gap-1">
                                <Zap className="w-3 h-3" /> {act.xp_reward} XP
                              </span>
                            )}
                            {act.due_date && !act.is_recurring && !act.is_quest && (
                              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {new Date(act.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {act.is_recurring && act.start_date && act.end_date && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(act.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} → {new Date(act.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {act.is_quest && act.quest_status === 'in_progress' && (
                              <span className="text-xs px-2 py-0.5 bg-bpjs-blue/20 text-bpjs-blue rounded-full font-medium">
                                🔵 Sedang Dikerjakan
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-white/70 leading-relaxed mt-1 whitespace-pre-line">{act.description}</p>

                          {/* Quest info: mulai kapan */}
                          {act.is_quest && act.quest_started_at && (
                            <p className="text-xs text-white/40 mt-2">
                              Mulai: {new Date(act.quest_started_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              {act.due_date && ` • Deadline: ${new Date(act.due_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                            </p>
                          )}

                          {/* Recurring progress bar */}
                          {act.is_recurring && act.progress_total_days && act.progress_total_days > 0 && (
                            <div className="mt-3 bg-white/5 rounded-lg p-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-white/60">📊 Progress minggu ini</span>
                                <span className="text-bpjs-yellow font-bold">{act.progress_completed_days}/{act.progress_total_days} hari</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-bpjs-green to-bpjs-yellow"
                                  style={{ width: `${Math.min(100, ((act.progress_completed_days || 0) / act.progress_total_days) * 100)}%` }}
                                />
                              </div>
                              {act.daily_deadline_hour && (
                                <p className="text-[10px] text-white/40 mt-1">⏰ Selesaikan sebelum jam {act.daily_deadline_hour}:00 WIB setiap hari</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recurring: tampilkan history mini hari ini */}
                      {act.is_recurring && act.my_daily_history && act.my_daily_history.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <span className="text-[10px] text-white/40">Riwayat:</span>
                          {act.my_daily_history.slice(-7).map((dc, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 bg-bpjs-green/20 text-bpjs-green rounded-full" title={`+${(dc.exp_awarded || 0) + (dc.bonus_exp_awarded || 0)} EXP`}>
                              ✓ {new Date(dc.completion_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Quest: tombol buka chat (submit via chat, bukan di sini) */}
                      {act.is_quest && act.quest_status === 'in_progress' && (
                        <a href={`/intern/chat/${act.group_id}`} className="w-full mt-2 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm">
                          <MessageCircle className="w-4 h-4" /> Buka Chat untuk Kirim Quest
                        </a>
                      )}

                      {/* Non-quest: tombol tandai selesai */}
                      {!act.is_quest && (
                      <>
                      {showCompleteModal === act.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            rows={2}
                            value={completionNotes}
                            onChange={(e) => setCompletionNotes(e.target.value)}
                            placeholder="Catatan hasil (opsional): contoh 'Selesai 50 dokumen', 'Dikerjakan 80%', 'Ada 3 dokumen kurang lengkap'..."
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setShowCompleteModal(null); setCompletionNotes(''); }}
                              className="flex-1 px-3 py-2 border border-white/10 text-white/60 text-sm rounded-lg"
                            >Batal</button>
                            <button
                              onClick={() => handleComplete(act.id)}
                              disabled={completing === act.id || (act.is_recurring && act.is_past_daily_deadline)}
                              className="flex-1 px-3 py-2 bg-bpjs-yellow text-bpjs-blue-dark font-bold text-sm rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                              {completing === act.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              {act.is_recurring ? 'Selesai Hari Ini (+20 EXP)' : 'Selesai (+20 EXP)'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setShowCompleteModal(act.id); setCompletionNotes(''); }}
                          disabled={act.is_recurring && act.is_past_daily_deadline}
                          className="w-full mt-2 flex items-center justify-center gap-2 bg-bpjs-yellow hover:bg-bpjs-yellow-dark text-bpjs-blue-dark font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {act.is_recurring && act.is_past_daily_deadline ? (
                            <><Clock className="w-4 h-4" /> Waktu Selesai Hari Ini (lewat deadline)</>
                          ) : (
                            <><CheckCircle2 className="w-4 h-4" /> {act.is_recurring ? 'Tandai Selesai Hari Ini' : 'Tandai Selesai'}</>
                          )}
                        </button>
                      )}
                      </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-bpjs-green flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Selesai Hari Ini ({completed.length})
                  </h2>
                  {completed.map((act) => (
                    <div key={act.id} className={`glass-card p-3 opacity-70 ${act.is_quest ? 'border-purple-400/40' : ''}`}>
                      <div className="flex items-start gap-2">
                        {act.is_quest ? (
                          <Target className="w-5 h-5 text-purple-300 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-bpjs-green flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-sm">{act.title}</h3>
                            {act.is_quest && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-200 rounded-full font-medium">🎯 Quest</span>
                            )}
                            {act.is_recurring && !act.is_quest && <span className="text-xs text-bpjs-green ml-1">(hari ini)</span>}
                            {act.is_quest && act.quest_xp_awarded && (
                              <span className="text-xs px-1.5 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-medium">
                                +{act.quest_xp_awarded} XP
                              </span>
                            )}
                          </div>
                          {act.my_completion && !act.is_recurring && !act.is_quest && (
                            <p className="text-xs text-white/50 mt-0.5">📝 {new Date(act.my_completion).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                          )}
                          {act.is_recurring && act.today_completion && !act.is_quest && (
                            <p className="text-xs text-white/50 mt-0.5">📝 Selesai hari ini {new Date(act.today_completion.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • +{(act.today_completion.exp_awarded || 0) + (act.today_completion.bonus_exp_awarded || 0)} EXP</p>
                          )}
                          {act.is_quest && act.quest_submitted_at && (
                            <p className="text-xs text-white/50 mt-0.5">
                              📝 Selesai {new Date(act.quest_submitted_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="glass-card p-3 bg-blue-500/10 border-blue-400/30 text-xs text-blue-200">
            💡 Riwayat semua aktivitas yang sudah kamu selesaikan — termasuk tugas, quest, dan pekerjaan tambahan.
          </div>
          {history.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <History className="w-12 h-12 mx-auto text-white/30 mb-3" />
              <p className="text-white/60">Belum ada riwayat aktivitas yang diselesaikan.</p>
            </div>
          ) : (
            <>
              {history.map((item) => {
                const isQuest = item.mode === 'quest' || item.source === 'quest';
                return (
                <div key={item.id + item.completed_at} className={`glass-card p-3 ${isQuest ? 'border-purple-400/40' : ''}`}>
                  <div className="flex items-start gap-2">
                    {isQuest ? (
                      <Target className="w-4 h-4 text-purple-300 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-bpjs-green flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">{item.title}</h4>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          isQuest ? 'bg-purple-500/30 text-purple-200 font-medium' :
                          item.source === 'self' ? 'bg-purple-500/20 text-purple-300' :
                          item.source === 'department' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          {isQuest ? '🎯 Quest' :
                           item.source === 'self' ? 'Dibuat sendiri' :
                           item.source === 'department' ? 'Departemen' : 'Ditugaskan'}
                        </span>
                        {isQuest && item.exp_gained && (
                          <span className="text-xs px-1.5 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded-full font-medium">
                            +{item.exp_gained} XP
                          </span>
                        )}
                        {isQuest && item.group_name && (
                          <span className="text-xs text-white/50 flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> {item.group_name}
                          </span>
                        )}
                      </div>
                      {item.completion_notes && (
                        <p className="text-xs text-white/60 mt-1">📝 {item.completion_notes}</p>
                      )}
                      <p className="text-xs text-white/40 mt-0.5">
                        {new Date(item.completed_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}

              {/* Recurring history (grouped) */}
              {recurringHistory.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-semibold text-bpjs-yellow flex items-center gap-2">
                    <Repeat className="w-4 h-4" /> Aktivitas Harian Berulang
                  </h3>
                  {recurringHistory.map((rh) => (
                    <div key={rh.activity_id} className="glass-card p-4 border-bpjs-green/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            🔁 {rh.title}
                          </h4>
                          <p className="text-xs text-white/60 mt-0.5">
                            📅 {rh.start_date && new Date(rh.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' → '}
                            {rh.end_date && new Date(rh.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-bpjs-yellow font-bold text-sm">+{rh.total_exp_gained} EXP</div>
                          <div className="text-[10px] text-white/50">{rh.daily_completions.length} hari</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mt-2">
                        {rh.daily_completions.slice(0, 14).map((dc, i) => (
                          <div
                            key={i}
                            className="text-[9px] text-center py-1 px-1 rounded bg-bpjs-green/20 text-bpjs-green"
                            title={`+${(dc.exp_awarded || 0) + (dc.bonus_exp_awarded || 0)} EXP • ${dc.completion_notes || ''}`}
                          >
                            {new Date(dc.completion_date).getDate()}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add activity modal (intern creates own) */}
      {showAddForm && (
        <InternAddActivityModal
          onClose={() => setShowAddForm(false)}
          onSuccess={() => { setShowAddForm(false); fetchAll(); }}
        />
      )}
    </div>
    </SecurityWrapper>
  );
}

function InternAddActivityModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', xp_reward: '20', related_department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingToday, setRemainingToday] = useState<number | null>(null);

  // Fetch sisa limit harian saat mount
  useEffect(() => {
    // Hitung dari API: count activities self-added hari ini
    // Pakai endpoint existing (activities/list atau fetch langsung)
    // Untuk simplicity, kita cek dari response intern-create berikutnya
    // Atau bisa via API khusus — tapi biar minimal, kita skip dulu & tampilkan info statis
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/activities/intern-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.remaining_today !== undefined) setRemainingToday(data.remaining_today);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-agent-card rounded-2xl max-w-md w-full shadow-2xl border border-agent-border">
        <div className="flex items-center justify-between p-5 border-b border-agent-border">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-bpjs-yellow" /> Tambah Aktivitas
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Info limit harian */}
          <div className="bg-bpjs-yellow/10 border border-bpjs-yellow/30 rounded-lg p-2.5 text-xs text-bpjs-yellow">
            ⚠️ Batas: maksimal 3 aktivitas self-added per hari (anti EXP-farming). Jika sudah habis, minta pembina tambahkan melalui DM.
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Judul *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
              placeholder="Bantu rekan urus arsip"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">Deskripsi *</label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
              placeholder="Catat apa yang kamu kerjakan hari ini..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">XP Reward</label>
            <div className="px-3 py-2 border border-white/10 bg-white/5 rounded-lg text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-bpjs-yellow" />
              <span className="font-semibold">20 EXP</span>
              <span className="text-xs text-white/40 ml-auto">Fixed — pembina bisa beri Bonus XP tambahan</span>
            </div>
          </div>
          {/* Bidang terkait — peserta kasih sinyal aktivitas ini berhubungan dengan bidang X */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Berhubungan dengan bidang lain? <span className="text-white/40 text-xs">(opsional)</span>
            </label>
            <select
              value={form.related_department}
              onChange={(e) => setForm({ ...form, related_department: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-bpjs-yellow"
            >
              <option value="" className="bg-agent-card">Tidak — bidang saya sendiri</option>
              <option value="Pelayanan" className="bg-agent-card">Pelayanan</option>
              <option value="Pemasaran" className="bg-agent-card">Pemasaran</option>
              <option value="Keuangan" className="bg-agent-card">Keuangan</option>
              <option value="Lintas Bidang" className="bg-agent-card">Lintas Bidang</option>
            </select>
            <p className="text-[10px] text-white/40 mt-1">
              💡 Kalau kamu bantu kerja divisi lain (mis. kamu Pelayanan bantu Pemasaran), pilih bidang tersebut. Pembina divisi itu bisa lihat aktivitasmu & kasih Bonus XP.
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-white/10 text-white/70 text-sm rounded-lg">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 bg-bpjs-yellow text-bpjs-blue-dark font-bold text-sm rounded-lg disabled:opacity-50 flex items-center justify-center gap-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Tambah
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
