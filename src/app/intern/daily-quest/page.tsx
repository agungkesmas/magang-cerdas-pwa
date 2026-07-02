'use client';

import { useState, useEffect } from 'react';
import {
  Swords,
  Loader2,
  Zap,
  Cpu,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Users,
  UserCog,
  UsersRound,
  Clock,
  Crown
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  department: string;
  base_description: string;
  target_count: number;
  is_active: boolean;
  mode: 'individual' | 'assigned' | 'team';
  due_date: string | null;
  created_at: string;
  teammates?: { id: string; name: string; major: string }[];
  team_progress_entries?: { chunk_index: number; completed_by: string; completed_by_intern_id: string }[];
}

interface Completion {
  id: string;
  task_id: string;
  chunk_index: number;
  completed_count: number;
  last_completed_at: string | null;
  ai_instruction: string | null;
}

export default function InternDailyQuestPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [teamProgress, setTeamProgress] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [aiInstructions, setAiInstructions] = useState<Record<string, string>>({});
  const [aiSource, setAiSource] = useState<Record<string, 'llm' | 'stub'>>({});
  const [recentExp, setRecentExp] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        fetch('/api/tasks/list'),
        fetch('/api/task-completion/list')
      ]);
      const tData = await tRes.json();
      const cData = await cRes.json();
      if (tData.success) setTasks(tData.tasks);
      if (cData.success) {
        setCompletions(cData.completions || []);
        setTeamProgress(cData.team_progress || {});
        // Pre-load AI instructions from existing completions (chunk_index=0)
        const cached: Record<string, string> = {};
        (cData.completions || []).forEach((c: Completion) => {
          if (c.chunk_index === 0 && c.ai_instruction) {
            cached[c.task_id] = c.ai_instruction;
          }
        });
        setAiInstructions(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateAI = async (task: Task) => {
    setGenerating({ ...generating, [task.id]: true });
    try {
      const dashRes = await fetch('/api/dashboard/intern');
      const dashData = await dashRes.json();
      const major = dashData.profile?.major || 'Umum';

      const res = await fetch('/api/generate-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_task: task.base_description,
          major,
          task_id: task.id,
          intern_id: dashData.profile?.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiInstructions({ ...aiInstructions, [task.id]: data.instruction });
        setAiSource({ ...aiSource, [task.id]: data.source });
      }
    } catch (e: any) {
      setErrorMsg('Error generate AI: ' + e.message);
      setTimeout(() => setErrorMsg(null), 3000);
    } finally {
      setGenerating({ ...generating, [task.id]: false });
    }
  };

  const completeChunk = async (task: Task, chunkIdx: number) => {
    setCompleting({ ...completing, [`${task.id}-${chunkIdx}`]: true });
    setErrorMsg(null);
    try {
      const res = await fetch('/api/task-completion/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, chunk_index: chunkIdx })
      });
      const data = await res.json();
      if (data.success) {
        setRecentExp(data.exp_gained);
        setTimeout(() => setRecentExp(null), 3000);
        fetchData();
      } else {
        setErrorMsg(data.error || 'Gagal complete chunk');
        setTimeout(() => setErrorMsg(null), 4000);
      }
    } catch (e: any) {
      setErrorMsg('Error: ' + e.message);
      setTimeout(() => setErrorMsg(null), 4000);
    } finally {
      setCompleting({ ...completing, [`${task.id}-${chunkIdx}`]: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Daily Quest
          </h1>
          <p className="text-sm text-white/60 mt-1">Tugas dipersonalisasi AI sesuai jurusan Anda</p>
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

      {tasks.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Swords className="w-12 h-12 mx-auto text-white/30 mb-3" />
          <p className="text-white/60">Belum ada tugas untuk departemen Anda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const chunkSize = Math.max(1, Math.ceil(task.target_count / 10));
            const totalChunks = Math.max(1, Math.ceil(task.target_count / chunkSize));
            const aiText = aiInstructions[task.id];
            const source = aiSource[task.id];
            const isGenerating = generating[task.id];

            // Calculate progress based on mode
            let completed: number;
            let doneChunks: number;
            let chunkCompletedBy: Record<number, string> = {};

            if (task.mode === 'team') {
              const tp = task.team_progress_entries || teamProgress[task.id] || [];
              doneChunks = tp.length;
              completed = doneChunks * chunkSize;
              completed = Math.min(completed, task.target_count);
              tp.forEach((p: any) => {
                chunkCompletedBy[p.chunk_index] = p.completed_by || 'Anggota Tim';
              });
            } else {
              // individual / assigned: count own completions
              const myCompletions = completions.filter((c) => c.task_id === task.id && c.completed_count > 0);
              doneChunks = myCompletions.length;
              completed = doneChunks * chunkSize;
              completed = Math.min(completed, task.target_count);
            }

            const pct = task.target_count > 0 ? Math.min(100, (completed / task.target_count) * 100) : 0;
            const isFullComplete = doneChunks >= totalChunks;
            const isOverdue = task.due_date ? new Date(task.due_date).getTime() < Date.now() : false;

            // Mode badge
            const modeInfo = task.mode === 'team'
              ? { label: 'Tim', color: 'bg-purple-500/20 text-purple-300', icon: UsersRound }
              : task.mode === 'assigned'
              ? { label: 'Assigned', color: 'bg-blue-500/20 text-blue-300', icon: UserCog }
              : { label: 'Individu', color: 'bg-gray-500/20 text-gray-300', icon: Users };
            const ModeIcon = modeInfo.icon;

            return (
              <div key={task.id} className="glass-card p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-white">{task.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${modeInfo.color}`}>
                        <ModeIcon className="w-3 h-3" /> {modeInfo.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-bpjs-blue/20 text-bpjs-blue-light rounded-full font-medium">
                        {task.department}
                      </span>
                      {task.due_date && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                          isOverdue ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {isOverdue ? 'Lewat deadline' : `Due: ${new Date(task.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50 line-clamp-2">{task.base_description}</p>
                  </div>
                </div>

                {/* Team members info */}
                {task.mode !== 'individual' && task.teammates && task.teammates.length > 0 && (
                  <div className="mb-3 bg-white/5 rounded-lg p-2">
                    <div className="text-xs text-white/60 mb-1 flex items-center gap-1">
                      {task.mode === 'team' ? <UsersRound className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
                      {task.mode === 'team' ? `Anggota Tim (${task.teammates.length})` : `Ditugaskan ke (${task.teammates.length})`}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {task.teammates.map((t) => (
                        <span key={t.id} className="text-xs px-2 py-0.5 bg-white/5 text-white/80 rounded-full">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Instruction */}
                {aiText ? (
                  <div className="bg-gradient-to-br from-bpjs-yellow/10 to-amber-500/5 border border-bpjs-yellow/30 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-bpjs-yellow" />
                      <span className="text-xs font-semibold text-bpjs-yellow">Instruksi AI (sesuai jurusan Anda)</span>
                      {source && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            source === 'llm' ? 'bg-bpjs-green/20 text-bpjs-green' : 'bg-orange-500/20 text-orange-300'
                          }`}
                        >
                          {source === 'llm' ? 'AI' : 'STUB'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/90 leading-relaxed">{aiText}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => generateAI(task)}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 bg-bpjs-yellow/5 hover:bg-bpjs-yellow/10 border border-bpjs-yellow/20 text-bpjs-yellow/80 font-medium py-1.5 rounded-lg text-xs disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5" /> Belum ada instruksi AI — klik untuk generate
                      </>
                    )}
                  </button>
                )}

                {/* Progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/60">
                      Progress: {completed} / {task.target_count}
                      {task.mode === 'team' && ' (tim)'}
                    </span>
                    <span className="text-white/60">{doneChunks} / {totalChunks} chunk</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all ${
                        task.mode === 'team'
                          ? 'bg-gradient-to-r from-purple-500 to-purple-400'
                          : 'bg-gradient-to-r from-bpjs-yellow to-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Micro-quests */}
                  {!isFullComplete ? (
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {Array.from({ length: totalChunks }).map((_, idx) => {
                        const isDone = idx < doneChunks;
                        const isCurrent = idx === doneChunks;
                        const isFuture = idx > doneChunks;
                        const isLoading = completing[`${task.id}-${idx}`];
                        const completedBy = chunkCompletedBy[idx];
                        return (
                          <button
                            key={idx}
                            onClick={() => isCurrent && !isOverdue && completeChunk(task, idx)}
                            disabled={isDone || isFuture || isLoading || !aiText || isOverdue}
                            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all relative ${
                              isDone
                                ? task.mode === 'team'
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-bpjs-green/20 text-bpjs-green'
                                : isCurrent && aiText && !isOverdue
                                ? task.mode === 'team'
                                  ? 'bg-purple-500 text-white hover:scale-105'
                                  : 'bg-bpjs-yellow text-bpjs-blue-dark hover:scale-105 pulse-glow'
                                : 'bg-white/5 text-white/30 cursor-not-allowed'
                            }`}
                            title={
                              isDone
                                ? task.mode === 'team' && completedBy
                                  ? `Chunk ${idx + 1} dikerjakan oleh: ${completedBy}`
                                  : `Chunk ${idx + 1} selesai`
                                : isCurrent
                                ? 'Klik untuk complete (+10 EXP)'
                                : isOverdue
                                ? 'Task sudah lewat deadline'
                                : 'Belum bisa diakses'
                            }
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`rounded-lg p-3 text-center ${
                      task.mode === 'team' ? 'bg-purple-500/10 border border-purple-500/30' : 'bg-bpjs-green/10 border border-bpjs-green/30'
                    }`}>
                      <CheckCircle2 className={`w-6 h-6 mx-auto mb-1 ${task.mode === 'team' ? 'text-purple-400' : 'text-bpjs-green'}`} />
                      <p className={`text-sm font-semibold ${task.mode === 'team' ? 'text-purple-400' : 'text-bpjs-green'}`}>
                        {task.mode === 'team' ? 'Tugas Tim Selesai! 🎉' : 'Tugas Selesai! +50 EXP bonus'}
                      </p>
                      {task.mode === 'team' && task.team_progress_entries && task.team_progress_entries.length > 0 && (
                        <p className="text-xs text-white/50 mt-1">
                          Kontribusi: {task.team_progress_entries.filter((p) => p.completed_by_intern_id === 'me').length} chunk oleh Anda
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="glass-card p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-bpjs-yellow flex-shrink-0 mt-0.5" />
        <div className="text-xs text-white/60 space-y-1">
          <p><strong className="text-white/80">3 Mode Tugas:</strong></p>
          <p>• <strong className="text-gray-300">Individu</strong> — dikerjakan sendiri, EXP per individu</p>
          <p>• <strong className="text-blue-300">Assigned</strong> — ditugaskan ke Anda khusus, EXP per individu</p>
          <p>• <strong className="text-purple-300">Tim</strong> — kolaboratif, 1 progress bersama, siapa cepat dia dapat EXP</p>
        </div>
      </div>
    </div>
  );
}
