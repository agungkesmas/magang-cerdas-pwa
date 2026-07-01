'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  Briefcase,
  Shield,
  Heart,
  PiggyBank,
  HandCoins,
  TrendingDown,
  Lock,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { SURVIVAL_KIT_MODULES } from '@/types';

const ICONS: Record<string, any> = {
  briefcase: Briefcase,
  shield: Shield,
  heart: Heart,
  'piggy-bank': PiggyBank,
  'hand-coins': HandCoins,
  'trending-down': TrendingDown
};

interface Progress {
  [moduleId: string]: {
    status: string;
    quiz_passed: boolean;
    last_updated: string;
  };
}

export default function InternSurvivalKitPage() {
  const [progress, setProgress] = useState<Progress>({});
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/survival-kit/progress');
      const data = await res.json();
      if (data.success) setProgress(data.progress || {});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  // Determine if a module is unlocked
  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    const prevModule = SURVIVAL_KIT_MODULES[idx - 1];
    return progress[prevModule.id]?.quiz_passed === true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-bpjs-yellow" />
      </div>
    );
  }

  if (activeModule) {
    const mod = SURVIVAL_KIT_MODULES.find((m) => m.id === activeModule);
    if (mod) {
      return (
        <ModuleDetailView
          module={mod}
          progress={progress[mod.id]}
          onBack={() => setActiveModule(null)}
          onComplete={(passed) => {
            fetchProgress();
            if (passed) {
              setTimeout(() => setActiveModule(null), 1500);
            }
          }}
        />
      );
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          Survival Kit Academy
        </h1>
        <p className="text-sm text-white/60 mt-1">
          Modul wajib: Etos Kerja + 5 Program BPJS Ketenagakerjaan
        </p>
      </div>

      <div className="space-y-3">
        {SURVIVAL_KIT_MODULES.map((mod, idx) => {
          const unlocked = isUnlocked(idx);
          const p = progress[mod.id];
          const passed = p?.quiz_passed;
          const inProgress = p?.status === 'in_progress';
          const Icon = ICONS[mod.icon] || BookOpen;

          return (
            <button
              key={mod.id}
              onClick={() => unlocked && setActiveModule(mod.id)}
              disabled={!unlocked}
              className={`w-full glass-card p-4 text-left transition-all ${
                unlocked ? 'hover:bg-white/5 cursor-pointer' : 'opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    passed
                      ? 'bg-bpjs-green/20 text-bpjs-green'
                      : inProgress
                      ? 'bg-bpjs-yellow/20 text-bpjs-yellow'
                      : unlocked
                      ? 'bg-bpjs-blue/20 text-bpjs-blue-light'
                      : 'bg-white/5 text-white/30'
                  }`}
                >
                  {passed ? <CheckCircle2 className="w-6 h-6" /> : !unlocked ? <Lock className="w-5 h-5" /> : <Icon className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm">{mod.title}</h3>
                    {passed && (
                      <span className="text-xs px-1.5 py-0.5 bg-bpjs-green/20 text-bpjs-green rounded font-bold">
                        ✓ SELESAI
                      </span>
                    )}
                    {inProgress && !passed && (
                      <span className="text-xs px-1.5 py-0.5 bg-bpjs-yellow/20 text-bpjs-yellow rounded font-bold">
                        SEDANG BERJALAN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{mod.description}</p>
                </div>
                {unlocked && !passed && <ArrowRight className="w-4 h-4 text-white/40" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModuleDetailView({
  module,
  progress,
  onBack,
  onComplete
}: {
  module: typeof SURVIVAL_KIT_MODULES[0];
  progress: any;
  onBack: () => void;
  onComplete: (passed: boolean) => void;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const Icon = ICONS[module.icon] || BookOpen;

  const handleAnswer = (idx: number) => {
    const newAns = [...answers, idx];
    setAnswers(newAns);
    if (currentQ + 1 < module.quizQuestions.length) {
      setCurrentQ(currentQ + 1);
    } else {
      setShowResult(true);
      // Calculate score
      const correct = newAns.filter((a, i) => a === module.quizQuestions[i].answer).length;
      const passed = correct >= Math.ceil(module.quizQuestions.length * 0.7);
      // Save to backend
      setSaving(true);
      fetch('/api/survival-kit/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: module.id,
          status: passed ? 'completed' : 'in_progress',
          quiz_passed: passed
        })
      })
        .then(() => {
          onComplete(passed);
        })
        .finally(() => setSaving(false));
    }
  };

  const correctCount = answers.filter((a, i) => a === module.quizQuestions[i].answer).length;
  const passed = correctCount >= Math.ceil(module.quizQuestions.length * 0.7);

  return (
    <div className="space-y-5 animate-fade-in">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-white/60 hover:text-white text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar modul
      </button>

      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-bpjs-blue/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-bpjs-blue-light" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{module.title}</h2>
            <p className="text-xs text-white/60">Modul {SURVIVAL_KIT_MODULES.findIndex((m) => m.id === module.id) + 1} dari {SURVIVAL_KIT_MODULES.length}</p>
          </div>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{module.description}</p>
      </div>

      {!showResult ? (
        <div className="glass-card p-5">
          <div className="text-xs text-white/60 mb-2">
            Pertanyaan {currentQ + 1} dari {module.quizQuestions.length}
          </div>
          <h3 className="text-base font-semibold text-white mb-4">
            {module.quizQuestions[currentQ].q}
          </h3>
          <div className="space-y-2">
            {module.quizQuestions[currentQ].options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(idx)}
                className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-bpjs-yellow/10 hover:border-bpjs-yellow/30 border border-white/10 transition-all"
              >
                <span className="text-sm text-white">{opt}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card p-5 text-center">
          {saving ? (
            <Loader2 className="w-12 h-12 text-bpjs-yellow mx-auto mb-3 animate-spin" />
          ) : passed ? (
            <>
              <CheckCircle2 className="w-14 h-14 text-bpjs-green mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Modul Selesai!</h3>
              <p className="text-sm text-white/60 mt-1">
                Benar: {correctCount} dari {module.quizQuestions.length}
              </p>
              <div className="mt-3 inline-flex items-center gap-1 bg-bpjs-yellow text-bpjs-blue-dark px-4 py-1.5 rounded-full font-bold">
                <Zap className="w-4 h-4" /> +25 EXP
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-14 h-14 text-orange-400 mx-auto mb-2" />
              <h3 className="text-lg font-bold text-white">Belum Lulus</h3>
              <p className="text-sm text-white/60 mt-1">
                Benar: {correctCount} dari {module.quizQuestions.length}. Minimal 70%.
              </p>
              <button
                onClick={() => {
                  setCurrentQ(0);
                  setAnswers([]);
                  setShowResult(false);
                }}
                className="mt-3 inline-flex items-center gap-1 bg-bpjs-yellow text-bpjs-blue-dark font-bold px-4 py-2 rounded-lg"
              >
                Coba Lagi
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
