'use client';

import { useState, useEffect } from 'react';
import {
  Swords,
  Loader2,
  Zap,
  Cpu,
  CheckCircle2,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  department: string;
  base_description: string;
  target_count: number;
  is_active: boolean;
}

interface Completion {
  id: string;
  task_id: string;
  chunk_index: number;
  completed_count: number;
  ai_instruction: string | null;
  last_completed_at: string | null;
}

export default function InternDailyQuestPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [aiInstructions, setAiInstructions] = useState<Record<string, string>>({});
  const [aiSource, setAiSource] = useState<Record<string, 'llm' | 'stub'>>({});
  const [recentExp, setRecentExp] = useState<number | null>(null);

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
      if (cData.success) setCompletions(cData.completions);
      // Pre-load AI instructions from existing completions
      const cached: Record<string, string> = {};
      const sourceMap: Record<string, 'llm' | 'stub'> = {};
      cData.completions?.forEach((c: Completion) => {
        if (c.ai_instruction) cached[c.task_id] = c.ai_instruction;
      });
      setAiInstructions(cached);
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
      // Fetch intern's major from dashboard
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
      alert('Error: ' + e.message);
    } finally {
      setGenerating({ ...generating, [task.id]: false });
    }
  };

  const completeChunk = async (task: Task, chunkIdx: number) => {
    setCompleting({ ...completing, [`${task.id}-${chunkIdx}`]: true });
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
        alert(data.error);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
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

      {tasks.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Swords className="w-12 h-12 mx-auto text-white/30 mb-3" />
          <p className="text-white/60">Belum ada tugas untuk departemen Anda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const completion = completions.find((c) => c.task_id === task.id);
            const completed = completion?.completed_count || 0;
            const pct = task.target_count > 0 ? Math.min(100, (completed / task.target_count) * 100) : 0;
            const chunkSize = Math.max(1, Math.ceil(task.target_count / 10));
            const totalChunks = Math.ceil(task.target_count / chunkSize);
            const doneChunks = Math.floor(completed / chunkSize);
            const isFullComplete = completed >= task.target_count;
            const aiText = aiInstructions[task.id];
            const source = aiSource[task.id];
            const isGenerating = generating[task.id];

            return (
              <div key={task.id} className="glass-card p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white">{task.title}</h3>
                    <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{task.base_description}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-bpjs-blue/20 text-bpjs-blue-light rounded-full font-medium whitespace-nowrap">
                    {task.department}
                  </span>
                </div>

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
                    className="w-full flex items-center justify-center gap-2 bg-bpjs-yellow/10 hover:bg-bpjs-yellow/20 border border-bpjs-yellow/30 text-bpjs-yellow font-medium py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Cpu className="w-4 h-4" /> Generate Instruksi AI Personal
                      </>
                    )}
                  </button>
                )}

                {/* Chunk progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/60">Progress: {completed} / {task.target_count}</span>
                    <span className="text-white/60">{doneChunks} / {totalChunks} micro-quests</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full bg-gradient-to-r from-bpjs-yellow to-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {/* Micro-quests */}
                  {!isFullComplete && (
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {Array.from({ length: totalChunks }).map((_, idx) => {
                        const isDone = idx < doneChunks;
                        const isCurrent = idx === doneChunks;
                        const isFuture = idx > doneChunks;
                        const isLoading = completing[`${task.id}-${idx}`];
                        return (
                          <button
                            key={idx}
                            onClick={() => isCurrent && completeChunk(task, idx)}
                            disabled={isDone || isFuture || isLoading || !aiText}
                            className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                              isDone
                                ? 'bg-bpjs-green/20 text-bpjs-green'
                                : isCurrent && aiText
                                ? 'bg-bpjs-yellow text-bpjs-blue-dark hover:scale-105 pulse-glow'
                                : 'bg-white/5 text-white/30 cursor-not-allowed'
                            }`}
                            title={isCurrent ? 'Klik untuk complete (+10 EXP)' : isDone ? 'Sudah selesai' : 'Belum bisa diakses'}
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle2 className="w-3 h-3" /> : idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {isFullComplete && (
                    <div className="bg-bpjs-green/10 border border-bpjs-green/30 rounded-lg p-3 text-center">
                      <CheckCircle2 className="w-6 h-6 text-bpjs-green mx-auto mb-1" />
                      <p className="text-sm font-semibold text-bpjs-green">Tugas Selesai! +50 EXP bonus</p>
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
        <p className="text-xs text-white/60">
          Klik "Generate Instruksi AI" untuk mendapat instruksi yang dipersonalisasi sesuai jurusan Anda.
          AI akan menyesuaikan fokus tugas berdasarkan skill khas jurusan Anda.
        </p>
      </div>
    </div>
  );
}
