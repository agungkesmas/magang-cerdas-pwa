'use client';

import { useState } from 'react';
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
  Lock
} from 'lucide-react';

interface QuestCardProps {
  quest: any;
  myQuestLog?: any;
  questLogs?: any[]; // untuk pembina: list semua peserta
  userRole: 'pembina' | 'peserta' | 'admin';
  onStart?: () => Promise<void>;
  onSubmit?: (notes: string) => Promise<void>;
  loading?: boolean;
}

export default function QuestCard({ quest, myQuestLog, questLogs, userRole, onStart, onSubmit, loading }: QuestCardProps) {
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);

  if (!quest) return null;

  const isOverdue = quest.due_date ? new Date(quest.due_date).getTime() < Date.now() : false;
  const slotsFull = quest.max_slots && quest.current_slots_taken >= quest.max_slots;

  const handleStart = async () => {
    setStarting(true);
    try { await onStart?.(); } finally { setStarting(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit?.(submissionNotes.trim());
      setShowSubmitForm(false);
      setSubmissionNotes('');
    } finally { setSubmitting(false); }
  };

  // Status peserta
  const myStatus = myQuestLog?.status; // available | in_progress | completed | cancelled
  const isInProgress = myStatus === 'in_progress';
  const isCompleted = myStatus === 'completed';

  return (
    <div className="bg-white border-2 border-purple-200 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-bold flex items-center gap-1">
              <Target className="w-3 h-3" /> QUEST
            </span>
            <h4 className="font-bold text-gray-900">{quest.title}</h4>
          </div>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Zap className="w-4 h-4 text-bpjs-yellow" />
          <span className="font-bold text-bpjs-yellow">{quest.xp_reward || 20} XP</span>
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
        {!quest.is_active && <span className="text-red-600 font-medium">Nonaktif</span>}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-700 whitespace-pre-line mb-3">{quest.description}</p>

      {/* ===== PESERTA VIEW ===== */}
      {userRole === 'peserta' && (
        <>
          {/* Status badges */}
          {isCompleted && (
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

          {isInProgress && !isCompleted && (
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
          {showSubmitForm && isInProgress && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 space-y-2">
              <label className="block text-xs font-semibold text-gray-700">Catatan hasil (opsional)</label>
              <textarea
                rows={2}
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Contoh: Selesai 8/10 dokumen, 2 kurang lengkap..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-bpjs-green/40"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowSubmitForm(false)} className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-md">Batal</button>
                <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-3 py-2 bg-bpjs-green text-white font-semibold text-sm rounded-md disabled:opacity-50 flex items-center justify-center gap-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />} Submit Quest
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {!isCompleted && quest.is_active && !isOverdue && (
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

          {isOverdue && !isCompleted && (
            <div className="text-center text-sm text-red-600 py-2">
              <AlertCircle className="w-4 h-4 inline mr-1" /> Quest sudah lewat deadline
            </div>
          )}
        </>
      )}

      {/* ===== PEMBINA VIEW: monitoring peserta ===== */}
      {(userRole === 'pembina' || userRole === 'admin') && questLogs && (
        <div className="mt-3 border-t pt-3">
          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <Users className="w-3 h-3" /> Progress Peserta ({questLogs.length} mengambil)
          </p>
          {questLogs.length === 0 ? (
            <p className="text-xs text-gray-400 italic">Belum ada peserta yang mengambil quest</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {questLogs.map((log: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                  <span className="font-medium text-gray-700">{log.intern_name || 'Peserta'}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    log.status === 'completed' ? 'bg-bpjs-green/10 text-bpjs-green' :
                    log.status === 'in_progress' ? 'bg-bpjs-blue/10 text-bpjs-blue' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {log.status === 'completed' ? '✓ Selesai' :
                     log.status === 'in_progress' ? '🔵 Proses' :
                     log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
