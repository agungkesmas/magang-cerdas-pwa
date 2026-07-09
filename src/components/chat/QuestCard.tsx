'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Target,
  Clock,
  Zap,
  Users,
  CheckCircle2,
  Loader2,
  AlertCircle,
  PlayCircle,
  StopCircle,
  Gift,
  MoreVertical,
  Edit2,
  Archive,
  RotateCcw,
  Ban,
  Trash2,
  X
} from 'lucide-react';

interface QuestLogEntry {
  id?: string; // quest_log_id (UUID) — dipakai untuk Bonus XP
  intern_id: string;
  intern_name: string;
  status: string;
  started_at?: string;
  submitted_at?: string;
  xp_awarded?: number;
  bonus_xp?: number; // sudah dapat bonus atau belum
  bonus_note?: string | null;
}

interface QuestCardProps {
  quest: any;
  myQuestLog?: any;
  myDailyCompletion?: any; // untuk recurring: completion hari ini
  questLogs?: QuestLogEntry[]; // untuk pembina: list semua peserta
  userRole: 'pembina' | 'peserta' | 'admin';
  canManage?: boolean; // pembina (creator) atau admin (always true)
  onStart?: () => Promise<void>;
  onSubmit?: (notes: string) => Promise<void>;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onForceCancel?: () => void;
  onDelete?: () => void;
  loading?: boolean;
  // Callback setelah bonus XP berhasil diberikan (untuk refresh chat)
  onBonusXpGiven?: () => void;
}

export default function QuestCard({
  quest,
  myQuestLog,
  myDailyCompletion,
  questLogs,
  userRole,
  canManage = false,
  onStart,
  onSubmit,
  onEdit,
  onArchive,
  onRestore,
  onForceCancel,
  onDelete,
  loading,
  onBonusXpGiven
}: QuestCardProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [starting, setStarting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Bonus XP modal state
  const [bonusTarget, setBonusTarget] = useState<QuestLogEntry | null>(null);
  const [bonusXp, setBonusXp] = useState(20);
  const [bonusNote, setBonusNote] = useState('');
  const [givingBonus, setGivingBonus] = useState(false);
  const [bonusError, setBonusError] = useState('');

  if (!quest) return null;

  const isOverdue = quest.due_date ? new Date(quest.due_date).getTime() < Date.now() : false;
  const slotsFull = quest.max_slots && quest.current_slots_taken >= quest.max_slots;
  const isArchived = quest.is_archived;

  const handleStart = async () => {
    setStarting(true);
    try { await onStart?.(); } finally { setStarting(false); }
  };

  const handleSubmit = async () => {
    if (submissionNotes.trim().length < 15) {
      setSubmitError('Keterangan minimal 15 karakter. Jelaskan singkat apa yang kamu kerjakan.');
      return;
    }
    setSubmitError('');
    setSubmitting(true);
    try {
      await onSubmit?.(submissionNotes.trim());
      setShowSubmitForm(false);
      setSubmissionNotes('');
    } finally { setSubmitting(false); }
  };

  const handleGiveBonus = async () => {
    if (!bonusTarget?.id) {
      setBonusError('Quest log ID tidak ditemukan');
      return;
    }
    if (bonusXp < 1 || bonusXp > 100) {
      setBonusError('Bonus XP harus antara 1 dan 100');
      return;
    }
    setGivingBonus(true);
    setBonusError('');
    try {
      const res = await fetch('/api/quests/bonus-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quest_log_id: bonusTarget.id,
          bonus_xp: bonusXp,
          note: bonusNote.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Success — tutup modal & refresh
      setBonusTarget(null);
      setBonusXp(20);
      setBonusNote('');
      onBonusXpGiven?.();
    } catch (err: any) {
      setBonusError(err.message);
    } finally {
      setGivingBonus(false);
    }
  };

  const handleMenuAction = (action: 'edit' | 'archive' | 'restore' | 'forceCancel' | 'delete') => {
    setMenuOpen(false);
    if (action === 'edit') onEdit?.();
    else if (action === 'archive') onArchive?.();
    else if (action === 'restore') onRestore?.();
    else if (action === 'forceCancel') onForceCancel?.();
    else if (action === 'delete') onDelete?.();
  };

  // Status peserta
  const myStatus = myQuestLog?.status;
  const isInProgress = myStatus === 'in_progress';
  const isCompleted = myStatus === 'completed';
  // Untuk recurring: cek apakah sudah complete hari ini
  const isRecurring = quest.is_recurring === true;
  const isCompletedToday = isRecurring && !!myDailyCompletion;

  // Untuk recurring: tidak ada konsep "permanen completed" — hanya "selesai hari ini"
  // Untuk non-recurring: completed = permanen
  const isPermanentlyDone = !isRecurring && isCompleted;

  return (
    <div className={`bg-white border-2 rounded-xl p-4 shadow-sm relative ${isArchived ? 'border-gray-200 opacity-75' : 'border-purple-200'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              isArchived ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-700'
            }`}>
              <Target className="w-3 h-3" /> {isArchived ? 'QUEST (ARSIP)' : 'QUEST'}
            </span>
            <h4 className="font-bold text-gray-900 break-words">{quest.title}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-sm">
            <Zap className="w-4 h-4 text-bpjs-yellow" />
            <span className="font-bold text-bpjs-yellow">{quest.xp_reward || 20} XP</span>
          </div>
          {/* ⋮ menu — only for pembina (creator) & admin */}
          {canManage && (userRole === 'pembina' || userRole === 'admin') && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                disabled={loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-50"
                title="Opsi quest"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm">
                  {/* Edit — disabled kalau sudah ada submission */}
                  {!isArchived && (
                    <button
                      onClick={() => handleMenuAction('edit')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-gray-700"
                    >
                      <Edit2 className="w-4 h-4" /> Edit Quest
                    </button>
                  )}
                  {/* Force-cancel — hanya jika ada peserta in_progress */}
                  {!isArchived && (
                    <button
                      onClick={() => handleMenuAction('forceCancel')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-orange-50 text-left text-orange-700"
                    >
                      <Ban className="w-4 h-4" /> Batalkan Peserta In-Progress
                    </button>
                  )}
                  {/* Archive */}
                  {!isArchived && (
                    <button
                      onClick={() => handleMenuAction('archive')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-gray-700"
                    >
                      <Archive className="w-4 h-4" /> Arsipkan Quest
                    </button>
                  )}
                  {/* Restore — admin only */}
                  {isArchived && userRole === 'admin' && (
                    <button
                      onClick={() => handleMenuAction('restore')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-50 text-left text-bpjs-green"
                    >
                      <RotateCcw className="w-4 h-4" /> Restore Quest
                    </button>
                  )}
                  {/* Delete permanen — admin only */}
                  {userRole === 'admin' && (
                    <button
                      onClick={() => handleMenuAction('delete')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-left text-red-600 border-t border-gray-100"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus Permanen
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 flex-wrap">
        {quest.due_date && (
          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
            <Clock className="w-3 h-3" />
            {isOverdue ? 'Lewat deadline' : `Deadline: ${new Date(quest.due_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
          </span>
        )}
        {quest.max_slots && (
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            Slot: {quest.current_slots_taken}/{quest.max_slots}
          </span>
        )}
        {!quest.is_active && !isArchived && <span className="text-orange-600 font-medium">Nonaktif</span>}
        {isArchived && <span className="text-gray-500 font-medium">Diarsipkan</span>}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{quest.description}</p>

      {/* ===== PESERTA VIEW ===== */}
      {userRole === 'peserta' && !isArchived && (
        <>
          {/* Status badges */}
          {isPermanentlyDone && (
            <div className="bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-3 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-bpjs-green" />
              <div>
                <p className="font-semibold text-bpjs-green-dark text-sm">Quest Selesai!</p>
                <p className="text-xs text-gray-600">
                  +{myQuestLog?.xp_awarded || quest.xp_reward || 20} XP • {myQuestLog?.submitted_at && new Date(myQuestLog.submitted_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          {/* Untuk recurring: badge "Selesai hari ini" */}
          {isCompletedToday && (
            <div className="bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-3 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-bpjs-green" />
              <div className="flex-1">
                <p className="font-semibold text-bpjs-green-dark text-sm">✓ Selesai hari ini!</p>
                <p className="text-xs text-gray-600">
                  +{myDailyCompletion?.xp_awarded || quest.xp_reward || 20} XP • Kembali besok untuk kerjakan lagi
                </p>
              </div>
            </div>
          )}

          {isInProgress && !isCompletedToday && !isPermanentlyDone && (
            <div className="bg-bpjs-blue/10 border border-bpjs-blue/30 rounded-lg p-3 mb-3 flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-bpjs-blue" />
              <div className="flex-1">
                <p className="font-semibold text-bpjs-blue-dark text-sm">Sedang Dikerjakan</p>
                <p className="text-xs text-gray-600">
                  Mulai: {myQuestLog?.started_at && new Date(myQuestLog.started_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          {/* Submit form */}
          {showSubmitForm && isInProgress && !isCompletedToday && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">
                Keterangan hasil <span className="text-red-500">*</span>
                <span className="text-gray-500 font-normal"> (minimal 15 karakter)</span>
              </label>
              <textarea
                rows={3}
                value={submissionNotes}
                onChange={(e) => { setSubmissionNotes(e.target.value); setSubmitError(''); }}
                placeholder="Contoh: Selesai memindai 8 dari 10 berkas klaim, 2 sisanya menunggu kelengkapan dokumen dari peserta..."
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={submissionNotes.trim().length >= 15 ? 'text-bpjs-green' : 'text-gray-500'}>
                  {submissionNotes.trim().length >= 15
                    ? '✓ Keterangan cukup, silakan kirim'
                    : `Masih perlu ${15 - submissionNotes.trim().length} karakter lagi`}
                </span>
                <span className="text-gray-400">{submissionNotes.trim().length}/15</span>
              </div>
              {submitError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {submitError}
                </p>
              )}
              <div className="flex gap-2">
                <button onClick={() => { setShowSubmitForm(false); setSubmissionNotes(''); setSubmitError(''); }} className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-md">Batal</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || submissionNotes.trim().length < 15}
                  className="flex-1 px-3 py-2 bg-bpjs-green text-white font-semibold text-sm rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Submit Quest
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isPermanentlyDone && !isCompletedToday && quest.is_active && !isOverdue && (
            <>
              {!isInProgress && !showSubmitForm && (
                <button
                  onClick={handleStart}
                  disabled={starting || slotsFull || loading}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                  {slotsFull ? 'Slot Penuh' : 'START QUEST'}
                </button>
              )}
              {isInProgress && !showSubmitForm && (
                <button
                  onClick={() => setShowSubmitForm(true)}
                  className="w-full px-4 py-2.5 bg-bpjs-green hover:bg-bpjs-green-dark text-white font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  <StopCircle className="w-4 h-4" /> SUBMIT QUEST
                </button>
              )}
            </>
          )}

          {isOverdue && !isPermanentlyDone && !isCompletedToday && (
            <div className="text-center text-sm text-red-600 py-2">
              <AlertCircle className="w-4 h-4 inline mr-1" /> Quest sudah lewat deadline
            </div>
          )}
        </>
      )}

      {/* ===== PEMBINA/ADMIN VIEW: monitoring peserta + Bonus XP ===== */}
      {(userRole === 'pembina' || userRole === 'admin') && questLogs && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Progress Peserta ({questLogs.length} mengambil)
          </p>
          {questLogs.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Belum ada peserta yang mengambil quest</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {questLogs.map((log: any, i: number) => {
                const isCompletedLog = log.status === 'completed';
                const isRecurringLog = quest.is_recurring === true;
                // Untuk recurring: cek daily_count > 0 (sudah pernah complete minimal 1 hari)
                const hasDailyCompletions = isRecurringLog && (log.daily_count || 0) > 0;
                const dailyCount = log.daily_count || 0;
                const latestDaily = log.daily_completions?.[0];
                const latestDailyBonus = latestDaily?.bonus_xp || 0;
                // Untuk non-recurring: pakai bonus_xp dari log
                // Untuk recurring: pakai latest_daily_bonus_xp
                const hasBonus = isRecurringLog
                  ? latestDailyBonus > 0
                  : (log.bonus_xp !== undefined && log.bonus_xp !== null && log.bonus_xp > 0);
                const bonusXpValue = isRecurringLog ? latestDailyBonus : (log.bonus_xp || 0);
                const bonusNoteValue = isRecurringLog ? (latestDaily?.bonus_note || null) : (log.bonus_note || null);
                // Hanya pembina yang bisa kasih bonus (bukan admin)
                // Untuk recurring: kasih bonus kalau sudah ada daily completion & belum dapat bonus untuk latest daily
                // Untuk non-recurring: kasih bonus kalau status completed & belum dapat bonus
                const canGiveBonus = userRole === 'pembina' && (
                  isRecurringLog
                    ? (hasDailyCompletions && !hasBonus)
                    : (isCompletedLog && !hasBonus)
                );
                return (
                  <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-gray-700 truncate">{log.intern_name || 'Peserta'}</span>
                        {isRecurringLog ? (
                          // Status untuk recurring: tampilkan daily count
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${hasDailyCompletions ? 'bg-bpjs-green/10 text-bpjs-green' : 'bg-gray-200 text-gray-600'}`}>
                            {hasDailyCompletions ? `✓ ${dailyCount} hari` : 'Belum mulai'}
                          </span>
                        ) : (
                          // Status untuk non-recurring
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${
                            log.status === 'completed' ? 'bg-bpjs-green/10 text-bpjs-green' :
                            log.status === 'in_progress' ? 'bg-bpjs-blue/10 text-bpjs-blue' :
                            log.status === 'cancelled' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {log.status === 'completed' ? '✓ Selesai' :
                             log.status === 'in_progress' ? '🔵 Proses' :
                             log.status === 'cancelled' ? '🚫 Dibatalkan' :
                             log.status}
                          </span>
                        )}
                        {/* XP awarded */}
                        {!isRecurringLog && isCompletedLog && log.xp_awarded !== undefined && (
                          <span className="text-bpjs-yellow font-semibold">+{log.xp_awarded} XP</span>
                        )}
                        {isRecurringLog && hasDailyCompletions && (
                          <span className="text-bpjs-yellow font-semibold" title={`Total XP dari ${dailyCount} hari`}>
                            +{dailyCount * (quest.xp_reward || 20)} XP
                          </span>
                        )}
                        {hasBonus && (
                          <span className="text-amber-600 font-semibold flex items-center gap-0.5" title={isRecurringLog ? `Bonus untuk ${latestDaily?.completion_date}` : undefined}>
                            <Gift className="w-3 h-3" /> +{bonusXpValue} bonus
                          </span>
                        )}
                      </div>
                      {hasBonus && bonusNoteValue && (
                        <p className="text-[10px] text-gray-500 italic mt-0.5 truncate">"{bonusNoteValue}"</p>
                      )}
                      {/* Untuk recurring: tampilkan tanggal terakhir selesai */}
                      {isRecurringLog && hasDailyCompletions && latestDaily && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          Terakhir: {new Date(latestDaily.completion_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                    {/* Tombol Bonus XP — hanya untuk pembina */}
                    {canGiveBonus && (
                      <button
                        onClick={() => {
                          setBonusTarget(log);
                          setBonusXp(20);
                          setBonusNote('');
                          setBonusError('');
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded text-[11px] font-semibold flex-shrink-0"
                        title={`Beri bonus XP ke ${log.intern_name}${isRecurringLog ? ` (untuk completion terakhir: ${latestDaily?.completion_date})` : ''}`}
                      >
                        <Gift className="w-3 h-3" /> +Bonus XP
                      </button>
                    )}
                    {/* Badge sudah dapat bonus — disabled */}
                    {userRole === 'pembina' && hasBonus && (
                      <span className="text-[10px] text-amber-600 font-medium flex-shrink-0">
                        ✓ Bonus diberikan
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {quest.is_recurring && (
            <p className="text-[10px] text-gray-400 italic mt-2">
              💡 Quest Harian Berulang: peserta bisa complete 1x per hari. Bonus XP berlaku per-hari (1 bonus per completion terakhir).
            </p>
          )}
        </div>
      )}

      {/* ===== BONUS XP MODAL ===== */}
      {bonusTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Beri Bonus XP</h3>
                  <p className="text-xs text-gray-500">Untuk {bonusTarget.intern_name}</p>
                </div>
              </div>
              <button
                onClick={() => setBonusTarget(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Bonus XP (1-100)
                </label>
                <div className="flex gap-1.5 mb-2">
                  {[10, 20, 30, 50].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setBonusXp(v)}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-semibold ${
                        bonusXp === v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      +{v}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={bonusXp}
                  onChange={(e) => setBonusXp(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Hanya bisa 1x per peserta per quest. Pesan otomatis akan dikirim ke chat grup.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Catatan untuk peserta (opsional)
                </label>
                <textarea
                  rows={2}
                  value={bonusNote}
                  onChange={(e) => setBonusNote(e.target.value)}
                  placeholder="Contoh: Laporan sangat detail, analisisnya mendalam. Semangat terus!"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
              </div>

              {bonusError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-xs">
                  {bonusError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setBonusTarget(null)}
                  disabled={givingBonus}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg"
                >
                  Batal
                </button>
                <button
                  onClick={handleGiveBonus}
                  disabled={givingBonus || bonusXp < 1 || bonusXp > 100}
                  className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-lg disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {givingBonus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  Beri +{bonusXp} XP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
